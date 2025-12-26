defmodule AppApiWeb.EnrichmentController do
  use AppApiWeb, :controller

  alias AppApi.Enrichment

  @doc """
  GET /api/enrichment/scan
  Returns count of listens missing metadata
  """
  def scan(conn, _params) do
    user_name = get_user_name_from_token(conn)

    case Enrichment.scan_missing_metadata(user_name) do
      {:ok, %{missing_count: count}} ->
        json(conn, %{
          success: true,
          missing_count: count
        })

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{success: false, error: "Scan failed: #{inspect(reason)}"})
    end
  end

  @doc """
  POST /api/enrichment/start
  Starts metadata enrichment process
  Query params:
    - limit: max tracks to process (default: 1000)
    - batch_size: tracks per batch (default: 50)
  """
  def start(conn, params) do
    user_name = get_user_name_from_token(conn)

    limit = parse_int_param(params["limit"], 1000)
    batch_size = parse_int_param(params["batch_size"], 50)

    case Enrichment.enrich_missing_metadata(user_name, limit: limit, batch_size: batch_size) do
      {:ok, results} ->
        json(conn, %{
          success: true,
          processed: results.processed,
          enriched: results.enriched,
          failed: results.failed
        })

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{success: false, error: "Enrichment failed: #{inspect(reason)}"})
    end
  end

  # === PRIVATE HELPERS ===

  defp get_user_name_from_token(_conn) do
    "viking_user"
  end

  defp parse_int_param(nil, default), do: default
  defp parse_int_param(str, default) when is_binary(str) do
    case Integer.parse(str) do
      {int, _} -> int
      :error -> default
    end
  end
  defp parse_int_param(int, _default) when is_integer(int), do: int
  defp parse_int_param(_, default), do: default
end
