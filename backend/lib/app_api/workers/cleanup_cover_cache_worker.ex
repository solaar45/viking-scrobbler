defmodule AppApi.Workers.CleanupCoverCacheWorker do
  @moduledoc """
  Periodic worker that removes cached cover files older than a retention period and deletes DB records.
  """
  use Oban.Worker, queue: :maintenance, max_attempts: 1
  require Logger
  alias AppApi.{Repo, CoverImage}
  import Ecto.Query, only: [from: 2]

  @retention_days Application.compile_env(:app_api, :cover_retention_days, 90)

  @impl Oban.Worker
  def perform(_job) do
    cutoff_dt = DateTime.utc_now() |> DateTime.add(-@retention_days * 24 * 3600, :second)
    cutoff_naive = DateTime.to_naive(cutoff_dt)

    # Find cover images older than retention (by inserted_at)
    old = Repo.all(from c in CoverImage, where: c.inserted_at <= ^cutoff_naive)

    Enum.each(old, fn %CoverImage{path: path} = ci ->
      full_path = Path.join(:code.priv_dir(:app_api) |> to_string(), Path.join(["static", path]))
      case File.rm(full_path) do
        :ok -> Logger.info("CleanupCoverCacheWorker: removed #{full_path}")
        {:error, _} -> Logger.debug("CleanupCoverCacheWorker: file missing #{full_path}")
      end

      Repo.delete(ci)
    end)

    :ok
  end
end
