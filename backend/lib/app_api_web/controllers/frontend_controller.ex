defmodule AppApiWeb.FrontendController do
  use AppApiWeb, :controller

  def index(conn, _params) do
    theme = conn.cookies["ui_theme"] || "flat"
    valid_theme = if theme in ["flat", "material"], do: theme, else: "flat"

    index_file =
      Application.app_dir(:app_api, "priv/static/themes/#{valid_theme}/index.html")

    conn
    |> put_resp_content_type("text/html")
    |> send_file(200, index_file)
  end

  def switch_theme(conn, %{"theme" => theme}) when theme in ["flat", "material"] do
    conn
    |> put_resp_cookie("ui_theme", theme, max_age: 60 * 60 * 24 * 365, path: "/")
    |> redirect(to: "/")
  end

  def switch_theme(conn, _params) do
    conn
    |> put_status(400)
    |> text("Invalid theme")
  end
end
