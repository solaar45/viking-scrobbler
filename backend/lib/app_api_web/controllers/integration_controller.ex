defmodule AppApiWeb.IntegrationController do
  use AppApiWeb, :controller
  alias AppApi.NavidromeIntegration

  # Test Navidrome Connection
  def test_navidrome(conn, %{"url" => url, "username" => username, "password" => password}) do
    case NavidromeIntegration.test_connection(url, username, password) do
      {:ok, message} ->
        json(conn, %{status: "ok", message: message})

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: reason})
    end
  end

  # Configure Navidrome (deprecated - use NavidromeController instead)
  def configure_navidrome(conn, params) do
    navidrome_url = params["navidrome_url"]
    # ✅ Prefix mit _ (wird aktuell nicht benötigt)
    _viking_url = params["viking_url"]
    username = params["username"]
    password = params["password"]
    user_name = params["user_name"] || "viking_user"

    # Neue API nutzen
    case NavidromeIntegration.test_and_save_connection(
           navidrome_url,
           username,
           password,
           user_name
         ) do
      {:ok, message} ->
        json(conn, %{status: "ok", message: message})

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: inspect(reason)})
    end
  end
end
