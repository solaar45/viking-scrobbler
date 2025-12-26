defmodule AppApi.NavidromeIntegration do
  @moduledoc """
  Hybrid Zero-Config Navidrome Integration
  Priority: DB Credentials > Auto-Discovery > ENV > MusicBrainz
  """

  require Logger
  alias AppApi.{Repo, Listen, NavidromeCredential}
  alias AppApi.Listens.Validator
  import Ecto.Query

  # === PUBLIC API ===

  @doc """
  Auto-enriches listen using hybrid credential resolution
  """
  def enrich_listen_from_navidrome(%Listen{} = listen) do
    with {:ok, navidrome_config} <- resolve_navidrome_config(listen),
         {:ok, song_data} <-
           search_song(
             navidrome_config.url,
             navidrome_config.username,
             navidrome_config.password,
             listen.artist_name,
             listen.track_name
           ) do
      update_listen_with_navidrome_data(listen, song_data)
    else
      {:error, reason} ->
        Logger.debug("Navidrome enrichment failed: #{inspect(reason)}")
        {:error, reason}
    end
  end

  @doc """
  Batch enrich recent listens without genres for a specific user.
  Returns count of successfully enriched listens.

  ## Examples

      iex> AppApi.NavidromeIntegration.enrich_recent_listens("viking_user", 50)
      42
  """
  def enrich_recent_listens(user_name, count \\ 50)
      when is_binary(user_name) and is_integer(count) do
    Logger.info("🔄 Starting batch enrichment for #{user_name}, limit: #{count}")

    # Query für Listens ohne Genres
    query =
      from l in Listen,
        where: l.user_name == ^user_name,
        where: fragment("? NOT LIKE '%genres%'", l.metadata) or l.metadata == "{}",
        order_by: [desc: l.listened_at],
        limit: ^count

    listens = Repo.all(query)
    total = length(listens)

    if total == 0 do
      Logger.info("✅ No listens found without genres")
      0
    else
      Logger.info("📊 Found #{total} listens without genres, enriching...")

      # Enrich jeden Listen mit Rate Limiting
      enriched_count =
        listens
        |> Enum.with_index(1)
        |> Enum.map(fn {listen, index} ->
          Logger.info(
            "Processing #{index}/#{total}: #{listen.artist_name} - #{listen.track_name}"
          )

          case enrich_listen_from_navidrome(listen) do
            {:ok, _} ->
              # Rate limiting (5 requests/sec)
              :timer.sleep(200)
              1

            {:error, reason} ->
              Logger.debug("Skipped listen #{listen.id}: #{inspect(reason)}")
              :timer.sleep(100)
              0
          end
        end)
        |> Enum.sum()

      Logger.info("✅ Batch enrichment completed: #{enriched_count}/#{total} listens enriched")

      enriched_count
    end
  end

  @doc """
  Test connection and optionally save credentials
  """
  def test_and_save_connection(url, username, password, user_name, save \\ true) do
    case test_connection(url, username, password) do
      {:ok, _} when save ->
        save_credentials(user_name, url, username, password, false)
        {:ok, "Connected and saved"}

      {:ok, msg} ->
        {:ok, msg}

      error ->
        error
    end
  end

  @doc """
  Get connection status for user
  """
  def get_connection_status(user_name) do
    case Repo.get_by(NavidromeCredential, user_name: user_name) do
      nil ->
        %{connected: false, source: "none"}

      cred ->
        %{
          connected: true,
          url: cred.url,
          username: cred.username,
          last_verified: cred.last_verified,
          auto_discovered: cred.auto_discovered,
          source: if(cred.auto_discovered, do: "auto", else: "manual")
        }
    end
  end

  # === HYBRID CONFIG RESOLUTION ===

  defp resolve_navidrome_config(listen) do
    user_name = listen.user_name

    # Priority 1: DB Credentials
    case get_db_credentials(user_name) do
      {:ok, config} ->
        Logger.debug("Using stored credentials for #{user_name}")
        {:ok, config}

      {:error, _} ->
        # Priority 2: Auto-Discovery from origin_url
        case auto_discover_from_listen(listen) do
          {:ok, config} ->
            Logger.info("✅ Auto-discovered Navidrome from origin_url")
            # Speichere für zukünftige Verwendung
            save_credentials(user_name, config.url, config.username, config.password, true)
            {:ok, config}

          {:error, _} ->
            # Priority 3: Network Scan
            case scan_network_for_navidrome(user_name) do
              {:ok, config} ->
                Logger.info("✅ Auto-discovered Navidrome via network scan")
                {:ok, config}

              {:error, _} ->
                # Priority 4: ENV Variables
                case get_env_credentials() do
                  {:ok, config} ->
                    Logger.debug("Using ENV credentials")
                    {:ok, config}

                  {:error, _} ->
                    {:error, :no_navidrome_config}
                end
            end
        end
    end
  end

  # === PRIORITY 1: DATABASE CREDENTIALS ===

  defp get_db_credentials(user_name) do
    case Repo.get_by(NavidromeCredential, user_name: user_name) do
      nil ->
        {:error, :not_found}

      cred ->
        token = NavidromeCredential.decrypt_token(cred)

        if token do
          {:ok,
           %{
             url: cred.url,
             username: cred.username,
             password: token
           }}
        else
          {:error, :decryption_failed}
        end
    end
  end

  defp save_credentials(user_name, url, username, password, auto_discovered) do
    %NavidromeCredential{}
    |> NavidromeCredential.changeset(%{
      user_name: user_name,
      url: url,
      username: username,
      token: password,
      last_verified: DateTime.utc_now(),
      auto_discovered: auto_discovered
    })
    |> Repo.insert(
      on_conflict: {:replace_all_except, [:inserted_at]},
      conflict_target: [:user_name, :url]
    )
  end

  # === PRIORITY 2: AUTO-DISCOVERY FROM ORIGIN_URL ===

  defp auto_discover_from_listen(listen) do
    additional_info = listen.additional_info || %{}

    case additional_info["origin_url"] do
      nil ->
        {:error, :no_origin_url}

      origin_url ->
        extract_navidrome_from_origin(origin_url, listen.user_name)
    end
  end

  defp extract_navidrome_from_origin(origin_url, username) do
    case URI.parse(origin_url) do
      %URI{scheme: scheme, host: host, port: port} when not is_nil(host) ->
        base_url = build_url(scheme, host, port)

        # Versuche mit gängigen Default-Credentials
        test_credentials = [
          {username, username},
          {username, "navidrome"},
          {"admin", "admin"}
        ]

        Enum.find_value(test_credentials, {:error, :auth_failed}, fn {user, pass} ->
          case test_connection(base_url, user, pass) do
            {:ok, _} ->
              {:ok, %{url: base_url, username: user, password: pass}}

            _ ->
              nil
          end
        end)

      _ ->
        {:error, :invalid_origin_url}
    end
  end

  defp build_url(scheme, host, nil), do: "#{scheme}://#{host}"
  defp build_url(scheme, host, port), do: "#{scheme}://#{host}:#{port}"

  # === PRIORITY 3: NETWORK SCAN ===

  defp scan_network_for_navidrome(username) do
    candidates = [
      "http://navidrome:4533",
      "http://navidrome:4000",
      "http://localhost:4533",
      "http://127.0.0.1:4533",
      "http://host.docker.internal:4533",
      "http://#{get_docker_gateway()}:4533",
      "http://192.168.0.1:4533",
      "http://192.168.1.1:4533",
      "http://192.168.178.1:4533"
    ]

    Enum.find_value(candidates, {:error, :not_found}, fn url ->
      case test_connection(url, username, username) do
        {:ok, _} ->
          Logger.info("✅ Found Navidrome at #{url}")
          {:ok, %{url: url, username: username, password: username}}

        _ ->
          nil
      end
    end)
  end

  defp get_docker_gateway do
    case System.cmd("ip", ["route", "show", "default"]) do
      {output, 0} ->
        output
        |> String.split()
        |> Enum.at(2)
        |> to_string()

      _ ->
        "172.17.0.1"
    end
  rescue
    _ -> "172.17.0.1"
  end

  # === PRIORITY 4: ENV VARIABLES ===

  defp get_env_credentials do
    config = %{
      url: System.get_env("NAVIDROME_URL"),
      username: System.get_env("NAVIDROME_USERNAME"),
      password: System.get_env("NAVIDROME_PASSWORD")
    }

    if config.url && config.username && config.password do
      {:ok, config}
    else
      {:error, :env_not_configured}
    end
  end

  # === SUBSONIC API ===

  def test_connection(url, username, password) do
    params = %{
      "u" => username,
      "p" => password,
      "v" => "1.16.1",
      "c" => "VikingScrobbler",
      "f" => "json"
    }

    query_string = URI.encode_query(params)
    test_url = "#{url}/rest/ping?#{query_string}"

    case HTTPoison.get(test_url, [], recv_timeout: 2000) do
      {:ok, %{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"subsonic-response" => %{"status" => "ok"}}} ->
            {:ok, "Connection successful"}

          _ ->
            {:error, "Invalid response"}
        end

      {:ok, %{status_code: 401}} ->
        {:error, "Invalid credentials"}

      {:ok, %{status_code: code}} ->
        {:error, "HTTP #{code}"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "Connection failed: #{reason}"}
    end
  end

  defp search_song(navidrome_url, username, password, artist, track) do
    params = %{
      "u" => username,
      "p" => password,
      "v" => "1.16.1",
      "c" => "VikingScrobbler",
      "f" => "json",
      "query" => "#{artist} #{track}",
      "songCount" => 5
    }

    query_string = URI.encode_query(params)
    url = "#{navidrome_url}/rest/search3?#{query_string}"

    case HTTPoison.get(url, [], recv_timeout: 5000) do
      {:ok, %{status_code: 200, body: body}} ->
        parse_search_response(body, artist, track)

      {:ok, %{status_code: code}} ->
        {:error, "Navidrome HTTP #{code}"}

      {:error, reason} ->
        {:error, "Request failed: #{inspect(reason)}"}
    end
  end

  defp parse_search_response(body, artist, track) do
    case Jason.decode(body) do
      {:ok, %{"subsonic-response" => %{"searchResult3" => %{"song" => songs}}}}
      when is_list(songs) and length(songs) > 0 ->
        matched_song =
          Enum.find(songs, fn song ->
            String.downcase(song["artist"] || "") == String.downcase(artist) and
              String.downcase(song["title"] || "") == String.downcase(track)
          end) || List.first(songs)

        extract_metadata(matched_song)

      {:ok, %{"subsonic-response" => %{"searchResult3" => %{}}}} ->
        {:error, :no_results}

      {:ok, _other} ->
        {:error, :invalid_response}

      {:error, reason} ->
        {:error, {:json_decode, reason}}
    end
  end

  defp extract_metadata(song) do
    metadata = %{
      "genre" => song["genre"],
      "genres" => parse_genres(song["genre"]),
      "album" => song["album"],
      "year" => song["year"],
      "duration_ms" => (song["duration"] || 0) * 1000,
      "tracknumber" => song["track"],
      "discnumber" => song["discNumber"],
      "bitrate" => song["bitRate"],
      "path" => song["path"]
    }

    {:ok, metadata}
  end

  defp parse_genres(nil), do: []

  defp parse_genres(genre_string) when is_binary(genre_string) do
    genre_string
    |> String.split(~r/[;,\/]/)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.take(5)
  end

  # === 🆕 ENHANCED: UPDATE WITH SKIP VALIDATION ===

  defp update_listen_with_navidrome_data(listen, navidrome_data) do
    # NOTE: In Unraid/bridge setups, Navidrome may return duration but no genres;
    # we must not block updates on genres presence.

    genres = navidrome_data["genres"] || []

    current_metadata = parse_metadata(listen.metadata)

    # Merge selected Navidrome fields into metadata (only when present)
    extra =
      %{}
      |> maybe_put(navidrome_data, "genres", if(length(genres) > 0, do: genres, else: nil))
      |> maybe_put(navidrome_data, "year", navidrome_data["year"])
      |> maybe_put(navidrome_data, "album", navidrome_data["album"])
      |> maybe_put(navidrome_data, "duration_ms", navidrome_data["duration_ms"])
      |> maybe_put(navidrome_data, "tracknumber", navidrome_data["tracknumber"])
      |> maybe_put(navidrome_data, "discnumber", navidrome_data["discnumber"])
      |> maybe_put(navidrome_data, "bitrate", navidrome_data["bitrate"])
      |> maybe_put(navidrome_data, "path", navidrome_data["path"])
      |> Map.put("source", "navidrome_id3")

    new_metadata = Map.merge(current_metadata, extra)

    # Extract duration from Navidrome (in seconds)
    duration_seconds = div(navidrome_data["duration_ms"] || 0, 1000)

    # Extract played_duration from additional_info if present
    played_duration =
      case listen.additional_info do
        %{"played_duration" => pd} when is_integer(pd) -> pd
        _ -> nil
      end

    # Run skip validation if we have duration
    validation =
      if duration_seconds > 0 do
        Validator.validate_listen(duration_seconds, played_duration)
      else
        nil
      end

    changeset =
      listen
      |> Ecto.Changeset.change(%{
        metadata: Jason.encode!(new_metadata),
        duration_ms: listen.duration_ms || navidrome_data["duration_ms"],
        tracknumber: listen.tracknumber || navidrome_data["tracknumber"],
        discnumber: listen.discnumber || navidrome_data["discnumber"],
        # NEW FIELDS (don't overwrite existing with nil/0)
        duration: if(duration_seconds > 0, do: duration_seconds, else: listen.duration),
        played_duration: played_duration || listen.played_duration,
        is_skipped: validation && validation.is_skipped,
        scrobble_percentage: validation && validation.scrobble_percentage,
        skip_reason: validation && validation.skip_reason
      })

    case Repo.update(changeset) do
      {:ok, updated_listen} ->
        skip_status =
          if validation && validation.is_skipped,
            do: " [SKIPPED: #{validation.skip_reason}]",
            else: ""

        Logger.info(
          "✅ Enriched listen #{listen.id} from Navidrome (genres=#{length(genres)})#{skip_status}"
        )

        # Notify connected clients that this listen was enriched
        try do
          AppApiWeb.Endpoint.broadcast!("scrobbles:#{listen.user_name}", "listen_enriched", %{
            listen_id: updated_listen.id,
            track_name: updated_listen.track_name,
            artist_name: updated_listen.artist_name,
            is_skipped: validation && validation.is_skipped
          })
        rescue
          _ -> Logger.debug("Navidrome broadcast failed or endpoint not available")
        end

        {:ok, updated_listen}

      {:error, changeset} ->
        Logger.error("Failed to update listen: #{inspect(changeset.errors)}")
        {:error, :update_failed}
    end
  end

  defp parse_metadata(nil), do: %{}

  defp parse_metadata(str) when is_binary(str) do
    case Jason.decode(str) do
      {:ok, map} -> map
      _ -> %{}
    end
  end

  # Helper: put key/value into acc only when value is present (non-nil)
  defp maybe_put(acc, _source_map, _key, nil), do: acc

  defp maybe_put(acc, _source_map, key, value) do
    Map.put(acc, key, value)
  end
end
