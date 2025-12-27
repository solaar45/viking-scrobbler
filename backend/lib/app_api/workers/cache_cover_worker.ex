defmodule AppApi.Workers.CacheCoverWorker do
  @moduledoc """
  Oban worker that fetches embedded cover for a given listen_id and caches it on disk + DB.
  It enforces MIME whitelist and size limit to avoid abuse.
  """
  use Oban.Worker, queue: :default, max_attempts: 3
  require Logger
  alias AppApi.{Repo, Listen, CoverImage, NavidromeIntegration}

    @max_bytes Application.compile_env(:app_api, :cover_max_bytes, 500_000) # 500 KB
  @allowed_mimes ["image/jpeg", "image/png", "image/webp"]

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"listen_id" => listen_id}}) do
    case Repo.get(Listen, listen_id) do
      nil ->
        Logger.debug("CacheCoverWorker: listen not found #{listen_id}")
        :ok

      listen ->
        # skip if already cached
        case Repo.get_by(CoverImage, listen_id: listen_id) do
          %CoverImage{} ->
            Logger.debug("CacheCoverWorker: already cached #{listen_id}")
            :ok

          nil ->
            fetch_and_store(listen)
        end
    end
  end

  defp fetch_and_store(listen) do
    case NavidromeIntegration.fetch_embedded_picture(listen) do
      {:ok, img} when is_binary(img) ->
        if String.starts_with?(img, "data:") do
          {mime, b64} = parse_data_uri(img)
          with true <- allowed_mime?(mime), {:ok, bin} <- Base.decode64(b64), true <- within_size?(byte_size(bin)) do
            write_cover(listen.id, mime, bin)
          else
              false -> Logger.warning("CacheCoverWorker: mime or size rejected for listen #{listen.id}") ; :ok
              {:error, _} -> Logger.warning("CacheCoverWorker: base64 decode failed for listen #{listen.id}") ; :ok
          end
        else
          Logger.warning("CacheCoverWorker: unexpected non-data URI embedded image for listen #{listen.id}")
          :ok
        end

      {:ok, {mime, data}} when is_binary(mime) and is_binary(data) ->
        if allowed_mime?(mime) and within_size?(byte_size(data)) do
          write_cover(listen.id, mime, data)
        else
            Logger.warning("CacheCoverWorker: mime or size rejected for listen #{listen.id}")
          :ok
        end

      {:error, reason} ->
        Logger.debug("CacheCoverWorker: failed to fetch embedded picture for #{listen.id}: #{inspect(reason)}")
        # fallback to metadata.cover_art if present
        attempt_fallback_from_metadata(listen)
    end
  end

  defp write_cover(listen_id, mime, bin) do
    ext = mime_to_ext(mime)
    rel_dir = Path.join([:code.priv_dir(:app_api) |> to_string(), "static", "embedded_covers"]) |> Path.expand()
    File.mkdir_p!(rel_dir)

    filename = "listen_#{listen_id}.#{ext}"
    full_path = Path.join(rel_dir, filename)
    File.write!(full_path, bin)

    db_path = Path.join(["embedded_covers", filename])

    %CoverImage{}
    |> CoverImage.changeset(%{listen_id: listen_id, kind: "listen", path: db_path, mime: mime})
    |> Repo.insert(on_conflict: :nothing)

    Logger.info("CacheCoverWorker: cached cover for listen #{listen_id}")
    :ok
  end

  defp parse_data_uri(<<"data:", rest::binary>>) do
    [meta, b64] = String.split(rest, ",", parts: 2)
    mime = meta |> String.split(";") |> List.first()
    {mime, b64}
  end

  defp allowed_mime?(mime) when is_binary(mime), do: mime in @allowed_mimes
  defp within_size?(bytes) when is_integer(bytes), do: bytes <= @max_bytes

  defp mime_to_ext("image/jpeg"), do: "jpg"
  defp mime_to_ext("image/png"), do: "png"
  defp mime_to_ext("image/webp"), do: "webp"
  defp mime_to_ext(_), do: "bin"

  defp attempt_fallback_from_metadata(listen) do
    max_bytes = @max_bytes
    allowed = @allowed_mimes

    meta = case listen.metadata do
      nil -> %{}
      s when is_binary(s) -> (try do Jason.decode!(s) rescue _ -> %{} end)
      m when is_map(m) -> m
      _ -> %{}
    end

    case Map.get(meta, "cover_art") do
      nil -> :ok
      url ->
        case HTTPoison.get(url, [], follow_redirect: true, recv_timeout: 10_000) do
          {:ok, %HTTPoison.Response{status_code: 200, body: body, headers: headers}} ->
            mime = headers |> Enum.find_value(fn {k, v} -> if String.downcase(to_string(k)) == "content-type", do: to_string(v) end) || "image/jpeg"
            if mime in allowed and byte_size(body) <= max_bytes do
              write_cover(listen.id, mime, body)
            else
              Logger.warning("CacheCoverWorker: fallback mime/size rejected for listen #{listen.id} #{inspect(mime)} / #{byte_size(body)}")
            end

          {:ok, %HTTPoison.Response{status_code: code}} ->
            Logger.debug("CacheCoverWorker: fallback HTTP status #{code} for listen #{listen.id}")

          {:error, reason} ->
            Logger.debug("CacheCoverWorker: fallback HTTP error for listen #{listen.id}: #{inspect(reason)}")
        end
    end
    :ok
  end
end
