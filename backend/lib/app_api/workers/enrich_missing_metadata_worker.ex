defmodule AppApi.Workers.EnrichMissingMetadataWorker do
  @moduledoc """
  Cron job to enrich Listens with missing metadata
  """
  
  use Oban.Worker,
    queue: :default,
    max_attempts: 1
  
  alias AppApi.MusicBrainz.Enricher
  alias AppApi.Workers.EnrichListenWorker
  require Logger
  
  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    Logger.info("Starting daily metadata enrichment")
    
    unenriched_listens = Enricher.find_unenriched_listens(500)
    
    Logger.info("Found #{length(unenriched_listens)} listens to enrich")
    
    if length(unenriched_listens) > 0 do
      Enum.each(unenriched_listens, fn listen ->
        %{listen_id: listen.id}
        |> EnrichListenWorker.new()
        |> Oban.insert()
      end)
      
      Logger.info("Queued #{length(unenriched_listens)} enrichment jobs")
    end
    
    :ok
  end
end
