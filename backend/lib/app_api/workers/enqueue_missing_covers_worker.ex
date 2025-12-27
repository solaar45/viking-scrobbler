defmodule AppApi.Workers.EnqueueMissingCoversWorker do
  @moduledoc """
  Periodic worker that finds recent listens without cached covers and enqueues `CacheCoverWorker` jobs.
  Limits the number of enqueues per run to avoid overloading Navidrome.
  """
  use Oban.Worker, queue: :maintenance, max_attempts: 1
  require Logger
  alias AppApi.{Repo, Listen, CoverImage}
  import Ecto.Query, only: [from: 2]

  @limit_per_run Application.compile_env(:app_api, :cover_enqueue_limit, 100)

  @impl Oban.Worker
  def perform(_job) do
    # Find listens ordered by listened_at desc that have no CoverImage
    q = from l in Listen,
      order_by: [desc: l.listened_at],
      limit: ^@limit_per_run,
      select: l.id

    ids = Repo.all(q)

    to_enqueue =
      ids
      |> Enum.reject(fn id -> Repo.get_by(CoverImage, listen_id: id) end)

    Enum.each(to_enqueue, fn id ->
      %{"listen_id" => id}
      |> AppApi.Workers.CacheCoverWorker.new()
      |> Oban.insert()
    end)

    Logger.info("EnqueueMissingCoversWorker: enqueued #{length(to_enqueue)} cache jobs")

    :ok
  end
end
