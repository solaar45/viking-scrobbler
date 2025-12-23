defmodule AppApiWeb.ScrobbleChannel do
  use AppApiWeb, :channel
  require Logger

  @impl true
  def join("scrobbles:" <> user_name, _payload, socket) do
    Logger.info("User #{user_name} joined scrobble channel")
    {:ok, assign(socket, :user_name, user_name)}
  end

  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # 🎯 NEU: Server broadcasts empfangen und an Clients pushen
  @impl true
  def handle_info(%{event: "new_scrobble", payload: payload}, socket) do
    push(socket, "new_scrobble", payload)
    {:noreply, socket}
  end
end
