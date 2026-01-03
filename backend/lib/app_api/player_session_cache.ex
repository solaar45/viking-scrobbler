defmodule AppApi.PlayerSessionCache do
  @moduledoc """
  Caches active player sessions for users to handle rapid track changes.
  
  When tracks are scrobbled quickly (e.g. skipping songs), the async
  getNowPlaying API may miss some tracks. This cache stores the last
  known player for each user with a TTL, ensuring consistent player
  attribution across a listening session.
  """
  
  use GenServer
  require Logger

  @session_ttl_seconds 300  # 5 minutes

  # Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @doc """
  Get cached player info for a user.
  Returns {:ok, player_info} or {:error, :not_found}
  """
  def get_player(user_name) do
    GenServer.call(__MODULE__, {:get, user_name})
  end

  @doc """
  Store player info for a user.
  Player info should be a map with keys: :player, :client, :platform
  """
  def put_player(user_name, player_info) do
    GenServer.cast(__MODULE__, {:put, user_name, player_info})
  end

  @doc """
  Clear cached player info for a user (e.g. on explicit logout)
  """
  def clear_player(user_name) do
    GenServer.cast(__MODULE__, {:clear, user_name})
  end

  # Server Callbacks

  @impl true
  def init(_) do
    # Schedule periodic cleanup
    schedule_cleanup()
    {:ok, %{}}
  end

  @impl true
  def handle_call({:get, user_name}, _from, state) do
    case Map.get(state, user_name) do
      nil ->
        {:reply, {:error, :not_found}, state}
      
      {player_info, expires_at} ->
        now = System.system_time(:second)
        if now < expires_at do
          {:reply, {:ok, player_info}, state}
        else
          # Expired, remove from state
          new_state = Map.delete(state, user_name)
          {:reply, {:error, :expired}, new_state}
        end
    end
  end

  @impl true
  def handle_cast({:put, user_name, player_info}, state) do
    expires_at = System.system_time(:second) + @session_ttl_seconds
    new_state = Map.put(state, user_name, {player_info, expires_at})
    Logger.debug("🎮 Cached player session: #{user_name} -> #{player_info.player} (expires in #{@session_ttl_seconds}s)")
    {:noreply, new_state}
  end

  @impl true
  def handle_cast({:clear, user_name}, state) do
    new_state = Map.delete(state, user_name)
    Logger.debug("🗑️  Cleared player session: #{user_name}")
    {:noreply, new_state}
  end

  @impl true
  def handle_info(:cleanup, state) do
    now = System.system_time(:second)
    
    # Remove expired entries
    new_state = 
      state
      |> Enum.reject(fn {_user, {_info, expires_at}} -> now >= expires_at end)
      |> Map.new()
    
    removed_count = map_size(state) - map_size(new_state)
    if removed_count > 0 do
      Logger.debug("🧹 Cleaned up #{removed_count} expired player sessions")
    end
    
    schedule_cleanup()
    {:noreply, new_state}
  end

  # Private Helpers

  defp schedule_cleanup do
    # Run cleanup every minute
    Process.send_after(self(), :cleanup, 60_000)
  end
end
