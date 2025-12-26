defmodule AppApiWeb.ImportController do
  use AppApiWeb, :controller

  # ✅ WICHTIG: Imports hinzufügen!
  import Ecto.Query
  alias AppApi.{Listen, Repo, NavidromeIntegration, GenreEnrichment}
  require Logger

  @doc """
  POST /api/import/listens

  Body (FormData):
  - file: JSON/CSV file
  - mode: "skip" | "merge" | "replace"
  - metadata_source: "navidrome" | "musicbrainz" | "original"
  - deduplicate: "true" | "false"
  """
  def import_listens(conn, params) do
    # Placeholder - hier muss die existierende Import-Logik bleiben
    # Diese Funktion sollte bereits existieren, wir fügen nur metadata_source hinzu

    user_name = get_user_name_from_token(conn)

    json(conn, %{
      success: false,
      error: "Import with metadata_source not yet implemented. Please add to existing import logic."
    })
  end

  # === PRIVATE: Import with Metadata Enrichment ===
  # Diese Funktionen können in die existierende Import-Logik integriert werden

  defp import_with_metadata_source(listens_data, user_name, metadata_source, deduplicate) do
    Enum.reduce(listens_data, %{imported: 0, enriched: 0, duplicates_skipped: 0, failed: 0}, fn listen_data, acc ->
      # Check for duplicates (optional)
      if deduplicate && duplicate_exists?(listen_data, user_name) do
        Logger.debug("⏭️ Skipping duplicate: #{get_in(listen_data, ["track_metadata", "track_name"])}")
        %{acc | duplicates_skipped: acc.duplicates_skipped + 1}
      else
        case import_single_listen(listen_data, user_name, metadata_source) do
          {:ok, :enriched} ->
            %{acc | imported: acc.imported + 1, enriched: acc.enriched + 1}

          {:ok, :original} ->
            %{acc | imported: acc.imported + 1}

          {:error, _reason} ->
            %{acc | failed: acc.failed + 1}
        end
      end
    end)
  end

  defp import_single_listen(listen_data, user_name, metadata_source) do
    # Step 1: Parse ListenBrainz format
    track_metadata = listen_data["track_metadata"] || %{}
    additional_info = track_metadata["additional_info"] || %{}

    # Step 2: Create base listen record
    listen_attrs = %{
      listened_at: listen_data["listened_at"],
      track_name: track_metadata["track_name"],
      artist_name: track_metadata["artist_name"],
      release_name: track_metadata["release_name"],
      recording_mbid: get_in(track_metadata, ["mbid_mapping", "recording_mbid"]),
      artist_mbid: List.first(get_in(track_metadata, ["mbid_mapping", "artist_mbids"]) || []),
      release_mbid: get_in(track_metadata, ["mbid_mapping", "release_mbid"]),
      user_name: user_name,
      origin_url: additional_info["origin_url"],
      music_service: additional_info["music_service"] || extract_service_from_url(additional_info["origin_url"]),
      duration_ms: additional_info["duration_ms"],
      tracknumber: additional_info["tracknumber"],
      discnumber: additional_info["discnumber"],
      metadata: Jason.encode!(%{}),
      additional_info: additional_info
    }

    # Step 3: Insert listen (without metadata yet)
    case %Listen{} |> Listen.changeset(listen_attrs) |> Repo.insert() do
      {:ok, listen} ->
        # Step 4: Enrich with chosen metadata source
        enrich_listen_metadata(listen, metadata_source)

      {:error, changeset} ->
        Logger.error("Failed to import listen: #{inspect(changeset.errors)}")
        {:error, :insert_failed}
    end
  end

  # === METADATA ENRICHMENT STRATEGIES ===

  defp enrich_listen_metadata(listen, "navidrome") do
    Logger.debug("🎵 Enriching from Navidrome: #{listen.track_name}")

    case NavidromeIntegration.enrich_listen_from_navidrome(listen) do
      {:ok, _updated_listen} ->
        {:ok, :enriched}

      {:error, reason} ->
        Logger.warning("⚠️ Navidrome enrichment failed: #{inspect(reason)}, keeping original")
        {:ok, :original}
    end
  end

  defp enrich_listen_metadata(listen, "musicbrainz") do
    Logger.debug("🎼 Enriching from MusicBrainz: #{listen.track_name}")

    case GenreEnrichment.enrich_listen(listen) do
      {:ok, _updated_listen} ->
        {:ok, :enriched}

      {:error, _reason} ->
        {:ok, :original}
    end
  end

  defp enrich_listen_metadata(_listen, "original") do
    # Keep original metadata from import source
    {:ok, :original}
  end

  defp enrich_listen_metadata(_listen, _unknown_source) do
    Logger.warning("Unknown metadata source, keeping original")
    {:ok, :original}
  end

  # === DUPLICATE DETECTION ===

  defp duplicate_exists?(listen_data, user_name) do
    track_metadata = listen_data["track_metadata"] || %{}
    listened_at = listen_data["listened_at"]
    track_name = track_metadata["track_name"]
    artist_name = track_metadata["artist_name"]

    # Check for duplicate within 5-second window
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

  # === HELPERS ===

  defp extract_service_from_url(nil), do: nil
  defp extract_service_from_url(url) when is_binary(url) do
    cond do
      String.contains?(url, "navidrome") -> "navidrome"
      String.contains?(url, "spotify") -> "spotify"
      String.contains?(url, "youtube") -> "youtube"
      String.contains?(url, "soundcloud") -> "soundcloud"
      true -> nil
    end
  end

  defp get_user_name_from_token(_conn), do: "viking_user"
end
