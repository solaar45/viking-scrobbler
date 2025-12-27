defmodule AppApiWeb.EnrichmentController do
  use AppApiWeb, :controller

  alias AppApi.Enrichment

  @doc """
  GET /api/enrichment/scan
  Returns granular breakdown of missing metadata
  
  Response:
  ```json
  {
    "success": true,
    "total_listens": 1234,
    "missing_genres": 42,
    "missing_year": 18,
    "missing_navidrome_id": 156,
    "missing_any": 180
  }
  ```
  """
  def scan(conn, _params) do
    user_name = get_user_name_from_token(conn)

    case Enrichment.scan_missing_metadata(user_name) do
      {:ok, stats} ->
        json(conn, Map.put(stats, :success, true))

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
    - field: "genres" | "year" | "navidrome_id" | "all" (default: "all")
    - limit: max tracks to process (default: 1000)
    - batch_size: tracks per batch (default: 50)
  
  Response:
  ```json
  {
    "success": true,
    "processed": 100,
    "enriched": 87,
    "failed": 10,
    "skipped": 3
  }
  ```
  """
  def start(conn, params) do
    user_name = get_user_name_from_token(conn)

    field = parse_field_param(params["field"])
    limit = parse_int_param(params["limit"], 1000)
    batch_size = parse_int_param(params["batch_size"], 50)

    opts = [
      field: field,
      limit: limit,
      batch_size: batch_size
    ]

    case Enrichment.enrich_metadata(user_name, opts) do
      {:ok, results} ->
        json(conn, Map.put(results, :success, true))

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{success: false, error: "Enrichment failed: #{inspect(reason)}"})
    end
  end

  # === PRIVATE HELPERS ===

  defp get_user_name_from_token(_conn) do
    # TODO: Extract from Bearer token when auth is implemented
    "viking_user"
  end

  defp parse_field_param(nil), do: :all
  defp parse_field_param("genres"), do: :genres
  defp parse_field_param("year"), do: :year
  defp parse_field_param("navidrome_id"), do: :navidrome_id
  defp parse_field_param("all"), do: :all
  defp parse_field_param(_), do: :all

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
