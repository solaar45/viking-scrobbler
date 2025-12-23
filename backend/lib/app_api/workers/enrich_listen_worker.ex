defmodule AppApi.Workers.EnrichListenWorker do
  @moduledoc """
  Background job to enrich a single Listen with MusicBrainz metadata
  """
  
  use Oban.Worker,
    queue: :musicbrainz,
    max_attempts: 3
  
  alias AppApi.{Listen, Repo}
  alias AppApi.MusicBrainz.Enricher
  require Logger
  
  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"listen_id" => listen_id}}) do
    Logger.info("Enriching listen #{listen_id}")
    
    case Repo.get(Listen, listen_id) do
      nil ->
        Logger.warning("Listen #{listen_id} not found")
        {:error, :not_found}
      
      listen ->
        case Enricher.enrich_listen(listen) do
          {:ok, _updated_listen} ->
            :ok
          
          {:error, :no_mbid} ->
            Logger.debug("Listen #{listen_id} has no MBID, skipping")
            :ok
          
          {:error, :not_found} ->
            Logger.debug("Recording not found in MusicBrainz")
            :ok
          
          {:error, reason} ->
            Logger.error("Failed to enrich listen #{listen_id}: #{inspect(reason)}")
            {:error, reason}
        end
    end
  end
end
