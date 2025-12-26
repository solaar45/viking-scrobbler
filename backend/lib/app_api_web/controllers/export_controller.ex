defmodule AppApiWeb.ExportController do
  use AppApiWeb, :controller

  alias AppApi.Export

  @doc """
  GET /api/export/listens?format=json&range=month&service=navidrome
  """
  def export_listens(conn, params) do
    user_name = get_user_name_from_token(conn)

    format = parse_format(params["format"])
    time_range = parse_time_range(params["range"], params)
    service = params["service"]

    case Export.export_listens(user_name, format: format, time_range: time_range, service: service) do
      {:ok, data} ->
        filename = build_filename(format, time_range)
        content_type = get_content_type(format)

        conn
        # ✅ CORS-Header explizit setzen (zusätzlich zu CORSPlug)
        |> put_resp_header("access-control-allow-origin", "*")
        |> put_resp_header("access-control-allow-methods", "GET, OPTIONS")
        |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
        |> put_resp_content_type(content_type)
        |> send_resp(200, data)

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> put_resp_header("access-control-allow-origin", "*")
        |> json(%{error: "Export failed: #{inspect(reason)}"})
    end
  end

  # === PRIVATE HELPERS ===

  defp get_user_name_from_token(_conn) do
    # Placeholder: use hardcoded "viking_user" or implement token validation
    "viking_user"
  end

  defp parse_format("csv"), do: :csv
  defp parse_format("json"), do: :json
  defp parse_format(_), do: :json

  defp parse_time_range("week", _), do: :week
  defp parse_time_range("month", _), do: :month
  defp parse_time_range("year", _), do: :year
  defp parse_time_range("all_time", _), do: :all_time
  defp parse_time_range("custom", %{"from" => from_str, "to" => to_str}) do
    {:custom, String.to_integer(from_str), String.to_integer(to_str)}
  end
  defp parse_time_range(_, _), do: :all_time

  defp build_filename(format, time_range) do
    date = Date.utc_today() |> Date.to_iso8601()
    ext = if format == :csv, do: "csv", else: "json"
    "viking-scrobbles-#{time_range}-#{date}.#{ext}"
  end

  defp get_content_type(:csv), do: "text/csv"
  defp get_content_type(:json), do: "application/json"
end
