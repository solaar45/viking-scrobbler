defmodule AppApiWeb.CoverController do
  @moduledoc """
  Cover Art Proxy - Serves embedded ID3 cover art from Navidrome.
  
  SECURITY:
  - Only serves covers for tracks with navidrome_id (ID3 tags)
  - No external URLs or MusicBrainz covers
  - Proxies through Navidrome getCoverArt API
  
  ENDPOINTS:
  - GET /api/covers/:navidrome_id?size=300
  - GET /api/listens/:listen_id/cover?size=300
  """

  use AppApiWeb, :controller
  require Logger

  alias AppApi.{Repo, Listen, NavidromeIntegration, NavidromeCredential}
  import Ecto.Query

  @default_size 300
  @max_size 600
  @cache_ttl 3600  # 1 hour in seconds

  @doc """
  GET /api/covers/:navidrome_id?size=300
  
  Direct cover fetch by Navidrome ID.
  Fastest route - use when navidrome_id is known.
  """
  def show_by_navidrome_id(conn, %{"navidrome_id" => navidrome_id} = params) do
    size = parse_size(params["size"])
    user_name = get_user_name_from_conn(conn)

    case get_navidrome_config(user_name) do
      {:ok, config} ->
        cover_url = build_navidrome_cover_url(config, navidrome_id, size)
        
        # Proxy the image
        case HTTPoison.get(cover_url, [], recv_timeout: 10_000) do
          {:ok, %{status_code: 200, body: body, headers: headers}} ->
            content_type = get_content_type(headers)
            
            conn
            |> put_resp_header("content-type", content_type)
            |> put_resp_header("cache-control", "public, max-age=#{@cache_ttl}")
            |> send_resp(200, body)

          {:ok, %{status_code: 404}} ->
            send_placeholder(conn)

          {:ok, %{status_code: code}} ->
            Logger.warning("Navidrome cover fetch failed: HTTP #{code}")
            send_placeholder(conn)

          {:error, reason} ->
            Logger.error("Navidrome cover proxy error: #{inspect(reason)}")
            send_placeholder(conn)
        end

      {:error, _reason} ->
        send_placeholder(conn)
    end
  end

  @doc """
  GET /api/listens/:listen_id/cover?size=300
  
  Cover fetch by Listen ID.
  Looks up navidrome_id from listen metadata.
  """
  def show_by_listen_id(conn, %{"listen_id" => listen_id} = params) do
    size = parse_size(params["size"])

    case Repo.get(Listen, listen_id) do
      nil ->
        send_placeholder(conn)

      listen ->
        metadata = parse_metadata(listen.metadata)

        case metadata["navidrome_id"] do
          nil ->
            # No navidrome_id -> no cover
            send_placeholder(conn)

          navidrome_id ->
            # Forward to navidrome_id route
            show_by_navidrome_id(conn, %{
              "navidrome_id" => navidrome_id,
              "size" => to_string(size)
            })
        end
    end
  end

  # === PRIVATE HELPERS ===

  defp get_navidrome_config(user_name) do
    case Repo.get_by(NavidromeCredential, user_name: user_name) do
      nil ->
        {:error, :no_credentials}

      cred ->
        password = NavidromeCredential.decrypt_token(cred)

        if password do
          {:ok,
           %{
             url: cred.url,
             username: cred.username,
             password: password
           }}
        else
          {:error, :decryption_failed}
        end
    end
  end

  defp build_navidrome_cover_url(config, navidrome_id, size) do
    params = %{
      "id" => navidrome_id,
      "size" => size,
      "u" => config.username,
      "p" => config.password,
      "v" => "1.16.1",
      "c" => "VikingScrobbler"
    }

    query = URI.encode_query(params)
    "#{config.url}/rest/getCoverArt?#{query}"
  end

  defp parse_size(nil), do: @default_size
  defp parse_size(size) when is_binary(size) do
    case Integer.parse(size) do
      {int, _} -> min(int, @max_size)
      :error -> @default_size
    end
  end
  defp parse_size(size) when is_integer(size), do: min(size, @max_size)
  defp parse_size(_), do: @default_size

  defp get_content_type(headers) do
    headers
    |> Enum.find(fn {key, _} -> String.downcase(key) == "content-type" end)
    |> case do
      {_, content_type} -> content_type
      nil -> "image/jpeg"
    end
  end

  defp send_placeholder(conn) do
    # Return 1x1 transparent PNG as placeholder
    placeholder = <<137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
      1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156,
      99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130>>

    conn
    |> put_resp_header("content-type", "image/png")
    |> put_resp_header("cache-control", "public, max-age=60")
    |> send_resp(200, placeholder)
  end

  defp parse_metadata(nil), do: %{}
  defp parse_metadata(""), do: %{}
  defp parse_metadata("{}"), do: %{}

  defp parse_metadata(metadata_str) when is_binary(metadata_str) do
    case Jason.decode(metadata_str) do
      {:ok, map} -> map
      {:error, _} -> %{}
    end
  end

  defp parse_metadata(map) when is_map(map), do: map

  defp get_user_name_from_conn(_conn) do
    # TODO: Extract from auth token when implemented
    "viking_user"
  end
end
