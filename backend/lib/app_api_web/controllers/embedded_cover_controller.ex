defmodule AppApiWeb.EmbeddedCoverController do
  use AppApiWeb, :controller
  alias AppApi.{Repo, Listen, CoverImage}
  alias AppApi.NavidromeIntegration
  require Logger

  # GET /api/embedded-cover/:kind/:id
  def show(conn, %{"kind" => _kind, "id" => id_str}) do
    case Integer.parse(id_str) do
      {id, _} -> serve_by_listen_id(conn, id)
      :error -> send_resp(conn, 404, "Not found")
    end
  end

  defp serve_by_listen_id(conn, id) do
    case Repo.get(Listen, id) do
      nil -> send_resp(conn, 404, "Not found")
      listen ->
        # Check cached record first
        case Repo.get_by(CoverImage, listen_id: id) do
          %CoverImage{path: path, mime: mime} = ci ->
            full_path = Path.join(:code.priv_dir(:app_api) |> to_string(), Path.join(["static", path]))
            if File.exists?(full_path) do
              {:ok, bin} = File.read(full_path)
              conn
              |> put_resp_header("cache-control", "public, max-age=86400")
              |> put_resp_content_type(mime)
              |> send_resp(200, bin)
            else
              Logger.debug("Cached cover file missing on disk: #{full_path}, removing DB record")
              Repo.delete(ci)
              fetch_and_cache(conn, listen)
            end

          nil ->
            fetch_and_cache(conn, listen)
        end
    end
  end

  defp fetch_and_cache(conn, listen) do
    # Try to extract embedded picture first
    case NavidromeIntegration.fetch_embedded_picture(listen) do
      {:ok, img} ->
        if is_binary(img) and String.starts_with?(img, "data:") do
          {mime, base64} = parse_data_uri(img)
          case Base.decode64(base64) do
            {:ok, bin} -> write_and_respond(conn, listen.id, "embedded_covers", mime, bin)
            _ -> send_resp(conn, 404, "No embedded image")
          end
        else
          send_resp(conn, 404, "No embedded image")
        end

      {:ok, {mime, data}} ->
        write_and_respond(conn, listen.id, "embedded_covers", mime, data)

      {:error, _} ->
        # Fallback: attempt to download Navidrome cover_art URL from metadata
        fallback_from_metadata(conn, listen)
    end
  end

  defp fallback_from_metadata(conn, listen) do
    max_bytes = Application.get_env(:app_api, :cover_max_bytes, 800_000)
    allowed = Application.get_env(:app_api, :cover_allowed_mimes, ["image/jpeg", "image/png", "image/webp"])

    meta = cond do
      is_nil(listen.metadata) -> %{}
      is_binary(listen.metadata) -> (try do Jason.decode!(listen.metadata) rescue _ -> %{} end)
      is_map(listen.metadata) -> listen.metadata
      true -> %{}
    end

    case Map.get(meta, "cover_art") do
      nil -> send_resp(conn, 404, "No embedded image")
      url ->
        case HTTPoison.get(url, [], follow_redirect: true, recv_timeout: 15_000) do
          {:ok, %HTTPoison.Response{status_code: 200, body: body, headers: headers}} ->
            mime = headers |> Enum.find_value(fn {k, v} -> if String.downcase(to_string(k)) == "content-type", do: to_string(v) end) || "image/jpeg"
            if mime in allowed and byte_size(body) <= max_bytes do
              write_and_respond(conn, listen.id, "embedded_covers", mime, body)
            else
              Logger.warn("Fallback cover skipped for listen #{listen.id}: mime=#{inspect(mime)} size=#{byte_size(body)}")
              send_resp(conn, 404, "No embedded image")
            end

          {:ok, %HTTPoison.Response{status_code: code}} ->
            Logger.warn("Fallback cover HTTP status #{code} for listen #{listen.id}")
            send_resp(conn, 404, "No embedded image")

          {:error, reason} ->
            Logger.error("Fallback cover download failed for listen #{listen.id}: #{inspect(reason)}")
            send_resp(conn, 404, "No embedded image")
        end
    end
  end

  defp write_and_respond(conn, listen_id, dir, mime, bin) do
    ext = case String.split(mime, "/") do
      [_, e] -> e
      _ -> "jpg"
    end

    rel_dir = Path.join([:code.priv_dir(:app_api) |> to_string(), "static", "embedded_covers"]) |> Path.expand()
    File.mkdir_p!(rel_dir)

    filename = "listen_#{listen_id}.#{ext}"
    full_path = Path.join(rel_dir, filename)
    # Save file to priv/static/embedded_covers
    File.write!(full_path, bin)

    # Build DB path relative to priv/static
    db_path = Path.join(["embedded_covers", filename])

    %CoverImage{}
    |> CoverImage.changeset(%{listen_id: listen_id, kind: "listen", path: db_path, mime: mime})
    |> Repo.insert(on_conflict: :nothing)

    conn
    |> put_resp_header("cache-control", "public, max-age=86400")
    |> put_resp_content_type(mime)
    |> send_resp(200, bin)
  end

  defp parse_data_uri(<<"data:", rest::binary>>) do
    # data:[<mediatype>][;base64],<data>
    [meta, b64] = String.split(rest, ",", parts: 2)
    mime = meta |> String.split(";") |> List.first()
    {mime, b64}
  end
end
