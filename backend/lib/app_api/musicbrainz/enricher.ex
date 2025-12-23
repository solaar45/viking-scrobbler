defmodule AppApi.MusicBrainz.Enricher do
  @moduledoc """
  Service to enrich Listen records with MusicBrainz metadata
  """
  
  alias AppApi.{Listen, Repo}
  alias AppApi.MusicBrainz.Client
  require Logger
  import Ecto.Query
  
  @doc """
  Enrich a single Listen with MusicBrainz metadata
  Returns: {:ok, updated_listen} | {:error, reason}
  """
  def enrich_listen(%Listen{} = listen) do
    cond do
      listen.recording_mbid && listen.recording_mbid != "" ->
        enrich_from_recording(listen)
      
      listen.release_mbid && listen.release_mbid != "" ->
        enrich_from_release(listen)
      
      true ->
        {:error, :no_mbid}
    end
  end
  
  @doc """
  Enrich multiple Listens (batch)
  """
  def enrich_batch(listens) when is_list(listens) do
    results = Enum.map(listens, fn listen ->
      case enrich_listen(listen) do
        {:ok, updated} -> {:ok, updated}
        {:error, reason} -> 
          Logger.warning("Failed to enrich listen #{listen.id}: #{inspect(reason)}")
          {:error, reason}
      end
    end)
    
    success_count = Enum.count(results, &match?({:ok, _}, &1))
    error_count = Enum.count(results, &match?({:error, _}, &1))
    
    Logger.info("Enriched #{success_count}/#{length(listens)} listens (#{error_count} errors)")
    
    {:ok, %{success: success_count, errors: error_count}}
  end
  
  @doc """
  Find Listens that need enrichment (missing metadata)
  """
  def find_unenriched_listens(limit \\ 100) do
    from(l in Listen,
      where: 
        (not is_nil(l.recording_mbid) or not is_nil(l.release_mbid)) and
        (is_nil(l.metadata) or l.metadata == "{}" or 
         fragment("json_extract(?, '$.genres') IS NULL", l.metadata)),
      order_by: [desc: l.listened_at],
      limit: ^limit
    )
    |> Repo.all()
  end
  
  # Private Helpers
  
  defp enrich_from_recording(listen) do
    case Client.fetch_recording(listen.recording_mbid) do
      {:ok, mb_data} ->
        update_listen_metadata(listen, mb_data)
      
      {:error, reason} ->
        Logger.warning("MusicBrainz fetch failed for #{listen.recording_mbid}: #{inspect(reason)}")
        {:error, reason}
    end
  end
  
  defp enrich_from_release(listen) do
    case Client.fetch_release(listen.release_mbid) do
      {:ok, mb_data} ->
        update_listen_metadata(listen, mb_data)
      
      {:error, reason} ->
        Logger.warning("MusicBrainz release fetch failed: #{inspect(reason)}")
        {:error, reason}
    end
  end
  
  defp update_listen_metadata(listen, mb_data) do
    # Parse existing metadata
    existing_metadata = case listen.metadata do
      str when is_binary(str) ->
        case Jason.decode(str) do
          {:ok, map} -> map
          {:error, _} -> %{}
        end
      _ -> %{}
    end
    
    # Merge with new data
    updated_metadata = Map.merge(existing_metadata, mb_data, fn
      _key, existing, new -> new || existing  # Prefer new data if not nil
    end)
    
    # Encode back to JSON string
    metadata_json = Jason.encode!(updated_metadata)
    
    # Update in database
    listen
    |> Ecto.Changeset.change(metadata: metadata_json)
    |> Repo.update()
    |> case do
      {:ok, updated_listen} ->
        Logger.info("Enriched listen #{listen.id}: added #{map_size(mb_data)} fields")
        {:ok, updated_listen}
      
      {:error, changeset} ->
        Logger.error("Failed to update listen #{listen.id}: #{inspect(changeset.errors)}")
        {:error, :update_failed}
    end
  end
end
