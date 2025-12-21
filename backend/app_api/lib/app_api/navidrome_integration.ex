defmodule AppApi.NavidromeIntegration do
  @moduledoc """
  Handles automatic Navidrome configuration via API
  """

  require Logger

  @doc """
  Configure Navidrome to scrobble to this Viking instance
  """
  def configure_navidrome(navidrome_url, navidrome_token, viking_url) do
    # Get current user info
    with {:ok, user_id} <- get_user_id(navidrome_url, navidrome_token),
         {:ok, _response} <- update_listenbrainz_settings(navidrome_url, navidrome_token, user_id, viking_url) do
      {:ok, "Navidrome configured successfully"}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Test connection to Navidrome
  """
  def test_connection(navidrome_url, navidrome_token) do
    headers = [
      {"Content-Type", "application/json"},
      {"x-nd-authorization", "Bearer #{navidrome_token}"}
    ]

    case HTTPoison.get("#{navidrome_url}/api/ping", headers) do
      {:ok, %{status_code: 200}} -> {:ok, "Connection successful"}
      {:ok, %{status_code: 401}} -> {:error, "Invalid token"}
      {:ok, %{status_code: code}} -> {:error, "HTTP #{code}"}
      {:error, %HTTPoison.Error{reason: reason}} -> {:error, "Connection failed: #{reason}"}
    end
  end

  # Private functions

  defp get_user_id(navidrome_url, token) do
    headers = [
      {"Content-Type", "application/json"},
      {"x-nd-authorization", "Bearer #{token}"}
    ]

    case HTTPoison.get("#{navidrome_url}/api/user", headers) do
      {:ok, %{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"id" => user_id}} -> {:ok, user_id}
          _ -> {:error, "Invalid response"}
        end

      _ ->
        {:error, "Failed to get user info"}
    end
  end

  defp update_listenbrainz_settings(navidrome_url, token, user_id, viking_url) do
    headers = [
      {"Content-Type", "application/json"},
      {"x-nd-authorization", "Bearer #{token}"}
    ]

    payload = %{
      "listenBrainzEnabled" => true,
      "listenBrainzURL" => viking_url
    }

    case HTTPoison.put(
           "#{navidrome_url}/api/user/#{user_id}",
           Jason.encode!(payload),
           headers
         ) do
      {:ok, %{status_code: 200}} ->
        {:ok, "Settings updated"}

      {:ok, %{status_code: code}} ->
        {:error, "HTTP #{code}"}

      {:error, reason} ->
        {:error, "Request failed: #{inspect(reason)}"}
    end
  end
end
