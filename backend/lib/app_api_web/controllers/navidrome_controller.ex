defmodule AppApiWeb.NavidromeController do
  use AppApiWeb, :controller
  alias AppApi.NavidromeIntegration

  # POST /api/navidrome/connect
  def connect(conn, %{"url" => url, "username" => username, "password" => password}) do
    user_name = get_user_name(conn)
    
    case NavidromeIntegration.test_and_save_connection(url, username, password, user_name) do
      {:ok, message} ->
        json(conn, %{status: "ok", message: message})
        
      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Connection failed: #{reason}"})
    end
  end

  # GET /api/navidrome/status
  def status(conn, _params) do
    user_name = get_user_name(conn)
    status = NavidromeIntegration.get_connection_status(user_name)
    
    json(conn, status)
  end

  # DELETE /api/navidrome/disconnect
  def disconnect(conn, _params) do
    user_name = get_user_name(conn)
    
    case AppApi.Repo.get_by(AppApi.NavidromeCredential, user_name: user_name) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Not connected"})
        
      cred ->
        AppApi.Repo.delete(cred)
        json(conn, %{status: "ok", message: "Disconnected"})
    end
  end

  defp get_user_name(conn) do
    # TODO: Extract from auth token
    # For now, use from localStorage or default
    conn.params["user_name"] || "viking_user"
  end
end
