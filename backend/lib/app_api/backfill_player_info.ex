defmodule AppApi.BackfillPlayerInfo do
  @moduledoc """
  Backfills missing player info, bitrate, and format for existing listens.
  
  This module provides utilities to enrich historical listens that were
  created before player info tracking was implemented.
  
  ## Usage
  
      # From IEx console
      AppApi.BackfillPlayerInfo.run("viking_user", 100)
      
      # Or from command line
      mix run -e 'AppApi.BackfillPlayerInfo.run("viking_user", 500)'
  
  ## Strategy
  
  Since historical listens can't use getNowPlaying (they're not currently
  playing), this module focuses on enriching metadata from Navidrome:
  - originalBitRate
  - originalFormat
  - genres (if missing)
  
  Player info cannot be reliably backfilled for old listens.
  """
  
  require Logger
  alias AppApi.{Repo, Listen, NavidromeIntegration}
  import Ecto.Query

  @doc """
  Backfill missing metadata for listens.
  
  Options:
  - `:batch_size` - Number of listens to process at once (default: 50)
  - `:rate_limit_ms` - Delay between requests in ms (default: 200)
  - `:missing_only` - Only process listens without metadata (default: true)
  """
  def run(user_name, limit \\ 100, opts \\ []) do
    batch_size = Keyword.get(opts, :batch_size, 50)
    rate_limit_ms = Keyword.get(opts, :rate_limit_ms, 200)
    missing_only = Keyword.get(opts, :missing_only, true)
    
    Logger.info("🚀 Starting backfill for #{user_name}, limit: #{limit}")
    
    # Build query based on options
    query = build_backfill_query(user_name, missing_only)
    
    # Process in batches
    total = Repo.aggregate(query, :count)
    batches = ceil(min(total, limit) / batch_size)
    
    Logger.info("📊 Found #{total} listens to process in #{batches} batches")
    
    results = 
      1..batches
      |> Enum.reduce({0, 0}, fn batch_num, {success, failed} ->
        Logger.info("📦 Processing batch #{batch_num}/#{batches}")
        
        listens = 
          query
          |> limit(^batch_size)
          |> offset(^((batch_num - 1) * batch_size))
          |> Repo.all()
        
        batch_results = process_batch(listens, rate_limit_ms)
        
        new_success = success + batch_results.success
        new_failed = failed + batch_results.failed
        
        Logger.info("✅ Batch complete: #{batch_results.success} success, #{batch_results.failed} failed")
        Logger.info("📊 Total progress: #{new_success}/#{min(total, limit)} (#{trunc(new_success / min(total, limit) * 100)}%)")
        
        {new_success, new_failed}
      end)
    
    {success, failed} = results
    
    Logger.info("""
    ✅ Backfill complete!
    ✅ Successfully enriched: #{success}
    ❌ Failed: #{failed}
    📊 Success rate: #{if success + failed > 0, do: trunc(success / (success + failed) * 100), else: 0}%
    """)
    
    {:ok, %{success: success, failed: failed}}
  end
  
  @doc """
  Dry run - shows what would be processed without making changes.
  """
  def dry_run(user_name, limit \\ 10) do
    query = build_backfill_query(user_name, true)
    
    listens = 
      query
      |> limit(^limit)
      |> Repo.all()
    
    Logger.info("🔍 DRY RUN: Would process #{length(listens)} listens")
    
    Enum.each(listens, fn listen ->
      additional_info = listen.additional_info || %{}
      
      Logger.info("""
      ➡️  #{listen.artist_name} - #{listen.track_name}
         ID: #{listen.id}
         media_player: #{additional_info["media_player"] || "MISSING"}
         originalBitRate: #{additional_info["originalBitRate"] || "MISSING"}
         originalFormat: #{additional_info["originalFormat"] || "MISSING"}
      """)
    end)
    
    total = Repo.aggregate(query, :count)
    Logger.info("📊 Total listens matching criteria: #{total}")
    
    {:ok, length(listens)}
  end
  
  # Private functions
  
  defp build_backfill_query(user_name, missing_only) do
    base_query = 
      from(l in Listen,
        where: l.user_name == ^user_name,
        order_by: [desc: l.listened_at]
      )
    
    if missing_only do
      # Only listens missing critical metadata
      from(l in base_query,
        where: 
          # Missing media_player OR bitrate OR format
          fragment(
            "(? IS NULL OR json_extract(?, '$.media_player') IS NULL OR " <>
            "json_extract(?, '$.originalBitRate') IS NULL OR " <>
            "json_extract(?, '$.originalFormat') IS NULL)",
            l.additional_info,
            l.additional_info,
            l.additional_info,
            l.additional_info
          )
      )
    else
      base_query
    end
  end
  
  defp process_batch(listens, rate_limit_ms) do
    listens
    |> Enum.reduce(%{success: 0, failed: 0}, fn listen, acc ->
      case enrich_listen(listen) do
        {:ok, _} ->
          :timer.sleep(rate_limit_ms)
          %{acc | success: acc.success + 1}
        
        {:error, reason} ->
          Logger.debug("⚠️  Failed to enrich #{listen.id}: #{inspect(reason)}")
          :timer.sleep(div(rate_limit_ms, 2))
          %{acc | failed: acc.failed + 1}
      end
    end)
  end
  
  defp enrich_listen(listen) do
    # Try Navidrome enrichment (bitrate, format, genres)
    case NavidromeIntegration.enrich_listen_from_navidrome(listen) do
      {:ok, enriched} ->
        Logger.debug("✅ #{listen.artist_name} - #{listen.track_name}")
        {:ok, enriched}
      
      {:error, reason} ->
        Logger.debug("❌ #{listen.artist_name} - #{listen.track_name}: #{inspect(reason)}")
        {:error, reason}
    end
  end
  
  @doc """
  Get statistics about missing metadata.
  """
  def stats(user_name) do
    total = Repo.aggregate(
      from(l in Listen, where: l.user_name == ^user_name),
      :count
    )
    
    missing_player = Repo.aggregate(
      from(l in Listen,
        where: l.user_name == ^user_name,
        where: fragment(
          "json_extract(?, '$.media_player') IS NULL",
          l.additional_info
        )
      ),
      :count
    )
    
    missing_bitrate = Repo.aggregate(
      from(l in Listen,
        where: l.user_name == ^user_name,
        where: fragment(
          "json_extract(?, '$.originalBitRate') IS NULL",
          l.additional_info
        )
      ),
      :count
    )
    
    missing_format = Repo.aggregate(
      from(l in Listen,
        where: l.user_name == ^user_name,
        where: fragment(
          "json_extract(?, '$.originalFormat') IS NULL",
          l.additional_info
        )
      ),
      :count
    )
    
    missing_genres = Repo.aggregate(
      from(l in Listen,
        where: l.user_name == ^user_name,
        where: fragment(
          "? NOT LIKE '%genres%' OR ? = '{}'",
          l.metadata,
          l.metadata
        )
      ),
      :count
    )
    
    stats = %{
      total: total,
      missing_player: missing_player,
      missing_bitrate: missing_bitrate,
      missing_format: missing_format,
      missing_genres: missing_genres,
      missing_any: Repo.aggregate(
        build_backfill_query(user_name, true),
        :count
      )
    }
    
    Logger.info("""
    📊 Statistics for #{user_name}:
    ✅ Total listens: #{stats.total}
    ❌ Missing player info: #{stats.missing_player} (#{percentage(stats.missing_player, stats.total)}%)
    ❌ Missing bitrate: #{stats.missing_bitrate} (#{percentage(stats.missing_bitrate, stats.total)}%)
    ❌ Missing format: #{stats.missing_format} (#{percentage(stats.missing_format, stats.total)}%)
    ❌ Missing genres: #{stats.missing_genres} (#{percentage(stats.missing_genres, stats.total)}%)
    ⚠️  Missing any metadata: #{stats.missing_any} (#{percentage(stats.missing_any, stats.total)}%)
    """)
    
    stats
  end
  
  defp percentage(_, 0), do: 0
  defp percentage(count, total), do: trunc(count / total * 100)
end
