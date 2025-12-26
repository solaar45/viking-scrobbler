defmodule AppApi.MusicBrainz.Client do
  @moduledoc """
  MusicBrainz API Client with rate limiting and search capabilities
  """

  require Logger

  @base_url "https://musicbrainz.org/ws/2"
  @user_agent "VikingScrobbler/1.0 (https://github.com/solaar45/viking-scrobbler)"
  @rate_limit_ms 1000

  @doc """
  Fetch recording metadata by MBID
  Returns: {:ok, metadata} | {:error, reason}
  """
  def fetch_recording(recording_mbid) when is_binary(recording_mbid) and recording_mbid != "" do
    url =
      "#{@base_url}/recording/#{recording_mbid}?inc=artist-credits+releases+genres+tags+isrcs&fmt=json"

    Logger.debug("Fetching MusicBrainz: #{url}")

    # Rate limiting
    :timer.sleep(@rate_limit_ms)

    case HTTPoison.get(url, headers()) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} -> {:ok, parse_recording_data(data)}
          {:error, reason} -> {:error, "JSON decode failed: #{inspect(reason)}"}
        end

      {:ok, %HTTPoison.Response{status_code: 404}} ->
        {:error, :not_found}

      {:ok, %HTTPoison.Response{status_code: status}} ->
        {:error, "HTTP #{status}"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "Request failed: #{inspect(reason)}"}
    end
  end

  def fetch_recording(_), do: {:error, :invalid_mbid}

  @doc """
  Search for recording by artist and track name
  Returns: {:ok, recording_mbid} | {:error, reason}
  """
  def search_recording(artist_name, track_name)
      when is_binary(artist_name) and is_binary(track_name) do
    # Clean strings for search
    artist_clean = String.trim(artist_name)
    track_clean = String.trim(track_name)

    query = URI.encode("artist:\"#{artist_clean}\" AND recording:\"#{track_clean}\"")
    url = "#{@base_url}/recording/?query=#{query}&fmt=json&limit=1"

    Logger.debug("Searching MusicBrainz: #{artist_clean} - #{track_clean}")

    :timer.sleep(@rate_limit_ms)

    case HTTPoison.get(url, headers()) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"recordings" => [first | _]}} ->
            mbid = first["id"]
            score = first["score"] || 0

            if score >= 85 do
              Logger.info(
                "Found MBID for '#{track_clean}' by #{artist_clean}: #{mbid} (score: #{score})"
              )

              {:ok, mbid}
            else
              Logger.debug("Low confidence match (score: #{score}), skipping")
              {:error, :low_confidence}
            end

          {:ok, %{"recordings" => []}} ->
            {:error, :not_found}

          {:error, reason} ->
            {:error, "JSON decode failed: #{inspect(reason)}"}
        end

      {:ok, %HTTPoison.Response{status_code: status}} ->
        {:error, "HTTP #{status}"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "Request failed: #{inspect(reason)}"}
    end
  end

  def search_recording(_, _), do: {:error, :invalid_params}

  @doc """
  Fetch release metadata by MBID
  """
  def fetch_release(release_mbid) when is_binary(release_mbid) and release_mbid != "" do
    url = "#{@base_url}/release/#{release_mbid}?inc=labels+recordings&fmt=json"

    Logger.debug("Fetching MusicBrainz Release: #{url}")

    :timer.sleep(@rate_limit_ms)

    case HTTPoison.get(url, headers()) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} -> {:ok, parse_release_data(data)}
          {:error, reason} -> {:error, "JSON decode failed: #{inspect(reason)}"}
        end

      {:ok, %HTTPoison.Response{status_code: 404}} ->
        {:error, :not_found}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "Request failed: #{inspect(reason)}"}
    end
  end

  def fetch_release(_), do: {:error, :invalid_mbid}

  # Private Helpers

  defp headers do
    [
      {"User-Agent", @user_agent},
      {"Accept", "application/json"}
    ]
  end

  defp parse_recording_data(data) do
    %{
      genres: extract_genres(data),
      tags: extract_tags(data),
      release_year: extract_year(data),
      isrc: extract_isrc(data),
      label: extract_label(data)
    }
  end

  defp parse_release_data(data) do
    %{
      release_year: extract_release_year(data),
      label: extract_release_label(data),
      barcode: Map.get(data, "barcode")
    }
  end

  defp extract_genres(data) do
    data
    |> Map.get("genres", [])
    |> Enum.map(& &1["name"])
    |> Enum.take(5)
  end

  defp extract_tags(data) do
    data
    |> Map.get("tags", [])
    |> Enum.filter(&(&1["count"] >= 1))
    |> Enum.map(& &1["name"])
    |> Enum.take(10)
  end

  defp extract_year(data) do
    data
    |> Map.get("releases", [])
    |> List.first()
    |> case do
      nil ->
        nil

      release ->
        release
        |> Map.get("date", "")
        |> String.split("-")
        |> List.first()
        |> parse_year()
    end
  end

  defp extract_release_year(data) do
    data
    |> Map.get("date", "")
    |> String.split("-")
    |> List.first()
    |> parse_year()
  end

  defp parse_year(year_str) when is_binary(year_str) do
    case Integer.parse(year_str) do
      {year, _} when year > 1900 and year < 2100 -> year
      _ -> nil
    end
  end

  defp parse_year(_), do: nil

  defp extract_isrc(data) do
    data
    |> Map.get("isrcs", [])
    |> List.first()
  end

  defp extract_label(data) do
    data
    |> Map.get("releases", [])
    |> List.first()
    |> case do
      nil ->
        nil

      release ->
        release
        |> Map.get("label-info", [])
        |> List.first()
        |> case do
          nil -> nil
          label_info -> get_in(label_info, ["label", "name"])
        end
    end
  end

  defp extract_release_label(data) do
    data
    |> Map.get("label-info", [])
    |> List.first()
    |> case do
      nil -> nil
      label_info -> get_in(label_info, ["label", "name"])
    end
  end
end
