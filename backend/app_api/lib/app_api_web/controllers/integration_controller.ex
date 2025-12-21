defmodule AppApiWeb.IntegrationController do
  use AppApiWeb, :controller
  alias AppApi.NavidromeIntegration
  alias AppApi.Repo
  alias AppApi.Integration

  # Test Navidrome connection
  def test_navidrome(conn, %{"navidrome_url" => url, "navidrome_token" => token}) do
    case NavidromeIntegration.test_connection(url, token) do
      {:ok, message} ->
        json(conn, %{status: "ok", message: message})

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{status: "error", message: reason})
    end
  end

  # Configure Navidrome
  def configure_navidrome(conn, params) do
    navidrome_url = params["navidrome_url"]
    navidrome_token = params["navidrome_token"]
    viking_url = params["viking_url"] || get_viking_url(conn)

    case NavidromeIntegration.configure_navidrome(navidrome_url, navidrome_token, viking_url) do
      {:ok, message} ->
        # Save integration settings
        save_integration(navidrome_url, navidrome_token)
        json(conn, %{status: "ok", message: message})

      {:error, reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{status: "error", message: reason})
    end
  end

  # Get saved integrations
  def get_integrations(conn, _params) do
    integrations = Repo.all(Integration)
    json(conn, %{integrations: integrations})
  end

  # Private helpers

  defp get_viking_url(conn) do
    scheme = if get_req_header(conn, "x-forwarded-proto") == ["https"], do: "https", else: "http"
    host = get_req_header(conn, "host") |> List.first() || "localhost:4000"
    "#{scheme}://#{host}"
  end

  defp save_integration(navidrome_url, token) do
    attrs = %{
      service: "navidrome",
      url: navidrome_url,
      token: token,
      enabled: true
    }

    case Repo.get_by(Integration, service: "navidrome") do
      nil -> %Integration{} |> Integration.changeset(attrs) |> Repo.insert()
      existing -> existing |> Integration.changeset(attrs) |> Repo.update()
    end
  end
end
