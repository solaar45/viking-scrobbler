defmodule AppApiWeb.ImportController do
  @moduledoc """
  Bulk Import Controller

  Handles file-based imports from:
  - Maloja
  - Navidrome exports
  - Last.fm
  - ListenBrainz exports
  - Generic JSON/CSV formats

  Features:
  - Duplicate detection
  - Import modes:
    * skip: Skip duplicates (default)
    * merge: Enrich existing scrobbles with metadata
    * replace: Delete all + fresh import
  - Metadata enrichment: original | navidrome | musicbrainz
  - Progress tracking
  - Detailed import statistics
  """

  use AppApiWeb, :controller
  alias AppApi.{Repo, Listen}
  import Ecto.Query
  require Logger

  # ============================================================================
  # PUBLIC API ENDPOINTS
  # ============================================================================

  @doc """
  POST /api/import/listens

  Bulk import listens from JSON/CSV file.

  Body:
  {
    "listen_type": "import",
    "metadata_source": "original" | "navidrome" | "musicbrainz",
    "import_mode": "skip" | "merge" | "replace",
    "deduplicate": true | false,
    "payload": [ ... array of listens ... ]
  }

  Response:
  {
    "status": "ok",
    "message": "Import complete",
    "stats": {
      "total": 100,
      "imported": 95,
      "updated": 0,
      "duplicates_skipped": 5,
      "failed": 0,
      "enriched": 95
    },
    "enrichment": "processing" | "none"
  }
  """
  def import_listens(conn, params) do
    Logger.info("📦 BULK IMPORT REQUEST")
    Logger.debug("Params: #{inspect(Map.keys(params))}")

    user_name = get_user_name(conn)
    payload = params["payload"] || []
    metadata_source = params["metadata_source"] || "original"
    import_mode = params["import_mode"] || "skip"
    deduplicate = params["deduplicate"] || true

    # Validate payload
    cond do
      payload == [] or not is_list(payload) ->
        Logger.warning("⚠️ Empty or invalid payload")
        conn
        |> put_status(:bad_request)
        |> json(%{
          status: "error",
          error: "Empty payload. Please provide listens to import.",
          received_count: 0
        })

      import_mode == "replace" ->
        Logger.warning("🗑️ REPLACE MODE: Will delete all existing data!")
        result = perform_replace_import(payload, user_name, metadata_source)
        json(conn, result)

      true ->
        Logger.info("📊 Starting import: #{length(payload)} listens, mode: #{import_mode}, metadata: #{metadata_source}, deduplicate: #{deduplicate}")

        result = perform_bulk_import(
          payload,
          user_name,
          metadata_source,
          import_mode,
          deduplicate
        )

        json(conn, result)
    end
  end

  # ============================================================================
  # PRIVATE FUNCTIONS: IMPORT MODES
  # ============================================================================

  # === MODE 1: SKIP DUPLICATES (Default) ===
  defp perform_bulk_import(payload, user_name, metadata_source, "skip", deduplicate) do
    start_time = System.monotonic_time(:millisecond)

    stats = %{
      total: length(payload),
      imported: 0,
      duplicates_skipped: 0,
      failed: 0,
      enriched: 0,
      errors: []
    }

    result =
      Enum.reduce(payload, stats, fn listen_data, acc ->
        track_metadata = listen_data["track_metadata"] || %{}
        track_name = track_metadata["track_name"]
        artist_name = track_metadata["artist_name"]
        listened_at = parse_timestamp(listen_data["listened_at"])

        # Skip if missing required fields
        if is_nil(track_name) or is_nil(artist_name) do
          Logger.warning("⚠️ Skipping listen with missing fields")
          %{acc | failed: acc.failed + 1, errors: ["Missing track_name or artist_name" | acc.errors]}
        else
          # Duplicate check
          if deduplicate && duplicate_exists?(user_name, track_name, artist_name, listened_at) do
            Logger.debug("⏭️ Skipping duplicate: #{track_name} - #{artist_name}")
            %{acc | duplicates_skipped: acc.duplicates_skipped + 1}
          else
            case import_single_listen(listen_data, user_name) do
              {:ok, listen} ->
                # Schedule enrichment if requested
                if metadata_source != "original" do
                  Task.start(fn ->
                    enrich_listen(listen, metadata_source)
                  end)
                  %{acc | imported: acc.imported + 1, enriched: acc.enriched + 1}
                else
                  %{acc | imported: acc.imported + 1}
                end

              {:error, reason} ->
                error_msg = "#{track_name}: #{inspect(reason)}"
                Logger.error("❌ Import failed: #{error_msg}")
                %{acc | failed: acc.failed + 1, errors: [error_msg | acc.errors]}
            end
          end
        end
      end)

    end_time = System.monotonic_time(:millisecond)
    duration_seconds = (end_time - start_time) / 1000

    # Broadcast completion to frontend
    AppApiWeb.Endpoint.broadcast!(
      "scrobbles:#{user_name}",
      "import_complete",
      %{
        mode: "skip",
        imported: result.imported,
        duplicates_skipped: result.duplicates_skipped,
        failed: result.failed,
        enrichment: if(metadata_source == "original", do: "none", else: "processing"),
        duration: duration_seconds
      }
    )

    Logger.info("""
    📊 SKIP import complete in #{Float.round(duration_seconds, 2)}s:
       Total: #{result.total}
       ✅ Imported: #{result.imported}
       ⏭️ Duplicates: #{result.duplicates_skipped}
       ❌ Failed: #{result.failed}
       🎵 Enrichment: #{if metadata_source == "original", do: "none", else: "scheduled (#{result.enriched})"}
    """)

    %{
      status: "ok",
      message: "Import complete",
      stats: Map.drop(result, [:errors]),
      enrichment: if(metadata_source == "original", do: "none", else: "processing"),
      duration_seconds: Float.round(duration_seconds, 2)
    }
  end

  # === MODE 2: MERGE & ENRICH (Smart Update) ===
  defp perform_bulk_import(payload, user_name, metadata_source, "merge", _deduplicate) do
    start_time = System.monotonic_time(:millisecond)

    stats = %{
      total: length(payload),
      imported: 0,
      updated: 0,
      failed: 0,
      enriched: 0,
      errors: []
    }

    result =
      Enum.reduce(payload, stats, fn listen_data, acc ->
        track_metadata = listen_data["track_metadata"] || %{}
        track_name = track_metadata["track_name"]
        artist_name = track_metadata["artist_name"]
        listened_at = parse_timestamp(listen_data["listened_at"])

        # Skip if missing required fields
        if is_nil(track_name) or is_nil(artist_name) do
          Logger.warning("⚠️ Skipping listen with missing fields")
          %{acc | failed: acc.failed + 1}
        else
          # Check if exists
          existing = find_duplicate(user_name, track_name, artist_name, listened_at)

          if existing do
            # UPDATE existing entry with new metadata
            case update_listen_metadata(existing, listen_data, metadata_source) do
              {:ok, _updated} ->
                Logger.debug("🔄 Updated metadata: #{track_name}")
                %{acc | updated: acc.updated + 1, enriched: acc.enriched + 1}

              {:error, reason} ->
                error_msg = "Update failed: #{inspect(reason)}"
                Logger.error("❌ #{error_msg}")
                %{acc | failed: acc.failed + 1, errors: [error_msg | acc.errors]}
            end
          else
            # INSERT new entry
            case import_single_listen(listen_data, user_name) do
              {:ok, listen} ->
                if metadata_source != "original" do
                  Task.start(fn -> enrich_listen(listen, metadata_source) end)
                  %{acc | imported: acc.imported + 1, enriched: acc.enriched + 1}
                else
                  %{acc | imported: acc.imported + 1}
                end

              {:error, reason} ->
                error_msg = "Import failed: #{inspect(reason)}"
                Logger.error("❌ #{error_msg}")
                %{acc | failed: acc.failed + 1, errors: [error_msg | acc.errors]}
            end
          end
        end
      end)

    end_time = System.monotonic_time(:millisecond)
    duration_seconds = (end_time - start_time) / 1000

    AppApiWeb.Endpoint.broadcast!(
      "scrobbles:#{user_name}",
      "import_complete",
      %{
        mode: "merge",
        imported: result.imported,
        updated: result.updated,
        enrichment: if(metadata_source == "original", do: "none", else: "processing")
      }
    )

    Logger.info("""
    📊 MERGE import complete in #{Float.round(duration_seconds, 2)}s:
       Total: #{result.total}
       ✅ Imported: #{result.imported}
       🔄 Updated: #{result.updated}
       ❌ Failed: #{result.failed}
       🎵 Enrichment: #{if metadata_source == "original", do: "none", else: "scheduled (#{result.enriched})"}
    """)

    %{
      status: "ok",
      message: "Merge import complete",
      stats: Map.drop(result, [:errors]),
      enrichment: if(metadata_source == "original", do: "none", else: "processing"),
      duration_seconds: Float.round(duration_seconds, 2)
    }
  end

  # === MODE 3: REPLACE ALL (Delete + Import) ===
  defp perform_replace_import(payload, user_name, metadata_source) do
    start_time = System.monotonic_time(:millisecond)

    # Delete all existing listens
    {deleted_count, _} = Repo.delete_all(from l in Listen, where: l.user_name == ^user_name)
    Logger.warning("🗑️ Deleted #{deleted_count} existing listens")

    # Now import fresh data
    stats = %{
      total: length(payload),
      imported: 0,
      deleted: deleted_count,
      failed: 0,
      enriched: 0,
      errors: []
    }

    result =
      Enum.reduce(payload, stats, fn listen_data, acc ->
        track_metadata = listen_data["track_metadata"] || %{}
        track_name = track_metadata["track_name"]
        artist_name = track_metadata["artist_name"]

        if is_nil(track_name) or is_nil(artist_name) do
          %{acc | failed: acc.failed + 1}
        else
          case import_single_listen(listen_data, user_name) do
            {:ok, listen} ->
              # Schedule enrichment
              if metadata_source != "original" do
                Task.start(fn -> enrich_listen(listen, metadata_source) end)
                %{acc | imported: acc.imported + 1, enriched: acc.enriched + 1}
              else
                %{acc | imported: acc.imported + 1}
              end

            {:error, reason} ->
              error_msg = "Import failed: #{inspect(reason)}"
              Logger.error("❌ #{error_msg}")
              %{acc | failed: acc.failed + 1, errors: [error_msg | acc.errors]}
          end
        end
      end)

    end_time = System.monotonic_time(:millisecond)
    duration_seconds = (end_time - start_time) / 1000

    AppApiWeb.Endpoint.broadcast!(
      "scrobbles:#{user_name}",
      "import_complete",
      %{
        mode: "replace",
        deleted: result.deleted,
        imported: result.imported,
        enrichment: if(metadata_source == "original", do: "none", else: "processing")
      }
    )

    Logger.info("""
    📊 REPLACE import complete in #{Float.round(duration_seconds, 2)}s:
       🗑️ Deleted: #{result.deleted}
       ✅ Imported: #{result.imported}
       ❌ Failed: #{result.failed}
       🎵 Enrichment: #{if metadata_source == "original", do: "none", else: "scheduled (#{result.enriched})"}
    """)

    %{
      status: "ok",
      message: "Replace import complete",
      stats: Map.drop(result, [:errors]),
      enrichment: if(metadata_source == "original", do: "none", else: "processing"),
      duration_seconds: Float.round(duration_seconds, 2)
    }
  end

  # ============================================================================
  # HELPER FUNCTIONS
  # ============================================================================

  defp import_single_listen(listen_data, user_name) do
    track_metadata = listen_data["track_metadata"] || %{}

    attrs = %{
      listened_at: parse_timestamp(listen_data["listened_at"]),
      track_name: track_metadata["track_name"],
      artist_name: track_metadata["artist_name"],
      release_name: track_metadata["release_name"],
      recording_mbid: get_in(track_metadata, ["additional_info", "recording_mbid"]),
      artist_mbid: get_in(track_metadata, ["additional_info", "artist_mbid"]),
      release_mbid: get_in(track_metadata, ["additional_info", "release_mbid"]),
      additional_info: track_metadata["additional_info"] || %{},
      user_name: user_name,
      inserted_at: DateTime.utc_now() |> DateTime.truncate(:second)
    }

    %Listen{}
    |> Listen.changeset(attrs)
    |> Repo.insert()
  end

  defp duplicate_exists?(user_name, track_name, artist_name, listened_at) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where: l.track_name == ^track_name,
        where: l.artist_name == ^artist_name,
        where: l.listened_at >= ^(listened_at - 5),
        where: l.listened_at <= ^(listened_at + 5),
        limit: 1

    Repo.exists?(query)
  end

  defp find_duplicate(user_name, track_name, artist_name, listened_at) do
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where: l.track_name == ^track_name,
        where: l.artist_name == ^artist_name,
        where: l.listened_at >= ^(listened_at - 5),
        where: l.listened_at <= ^(listened_at + 5),
        limit: 1

    Repo.one(query)
  end

  defp update_listen_metadata(existing_listen, new_data, metadata_source) do
    track_metadata = new_data["track_metadata"] || %{}

    # Smart merge: Only improve existing data, never overwrite
    existing_info = existing_listen.additional_info || %{}
    new_info = track_metadata["additional_info"] || %{}

    merged_info =
      existing_info
      |> Map.merge(new_info, fn _key, existing_val, new_val ->
        # Keep existing value if better (not null/empty)
        cond do
          is_nil(existing_val) or existing_val == "" -> new_val
          is_nil(new_val) or new_val == "" -> existing_val
          true -> existing_val  # Existing data has priority
        end
      end)

    attrs = %{
      # === NEVER CHANGE ===
      # track_name: ...      ← User's Original
      # artist_name: ...     ← User's Original
      # listened_at: ...     ← Timestamp

      # === ONLY IMPROVE (if empty) ===
      additional_info: merged_info,

      # Album: Only change if currently empty
      release_name:
        if is_nil(existing_listen.release_name) or existing_listen.release_name == "" do
          track_metadata["release_name"]
        else
          existing_listen.release_name
        end,

      # MBIDs: Only add if empty
      recording_mbid: existing_listen.recording_mbid || get_in(track_metadata, ["additional_info", "recording_mbid"]),
      artist_mbid: existing_listen.artist_mbid || get_in(track_metadata, ["additional_info", "artist_mbid"]),
      release_mbid: existing_listen.release_mbid || get_in(track_metadata, ["additional_info", "release_mbid"])
    }

    existing_listen
    |> Listen.changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_listen} ->
        # Enrich metadata (Genres, Year)
        if metadata_source != "original" do
          Task.start(fn -> enrich_listen(updated_listen, metadata_source) end)
        end
        {:ok, updated_listen}

      error -> error
    end
  end

  defp enrich_listen(listen, "navidrome") do
    case AppApi.NavidromeIntegration.enrich_listen_from_navidrome(listen) do
      {:ok, _} ->
        Logger.debug("✅ Enriched from Navidrome: #{listen.track_name}")
      {:error, _} ->
        Logger.debug("⚠️ Navidrome enrichment failed: #{listen.track_name}")
    end
    :timer.sleep(200)
  end

  defp enrich_listen(listen, "musicbrainz") do
    case AppApi.GenreEnrichment.enrich_listen(listen) do
      {:ok, _} ->
        Logger.debug("✅ Enriched from MusicBrainz: #{listen.track_name}")
      {:error, _} ->
        Logger.debug("⚠️ MusicBrainz enrichment failed: #{listen.track_name}")
    end
    :timer.sleep(300)
  end

  defp enrich_listen(_listen, _source), do: :ok

  defp get_user_name(_conn) do
    # Single-user setup
    "viking_user"
  end

  defp parse_timestamp(nil), do: DateTime.utc_now() |> DateTime.to_unix()
  defp parse_timestamp(ts) when is_binary(ts) do
    case Integer.parse(ts) do
      {timestamp, _} -> timestamp
      :error -> DateTime.utc_now() |> DateTime.to_unix()
    end
  end
  defp parse_timestamp(ts) when is_integer(ts), do: ts
  defp parse_timestamp(_), do: DateTime.utc_now() |> DateTime.to_unix()
end
