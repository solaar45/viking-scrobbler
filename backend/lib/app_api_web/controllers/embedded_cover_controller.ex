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
    # Extract embedded picture from audio file via Navidrome
    case NavidromeIntegration.fetch_embedded_picture(listen) do
      {:ok, img} when is_binary(img) ->
        if String.starts_with?(img, "data:") do
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
        # Kein Fallback - nur ID3-Cover oder 404
        send_resp(conn, 404, "No embedded image")
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
