defmodule AppApiWeb.Router do
  use AppApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug CORSPlug, origin: [
      "http://localhost:5173",
      "http://localhost:5174", 
      "http://127.0.0.1:5173",
      "http://localhost:8080",
      "http://127.0.0.1:8080"
    ]
  end

  scope "/api", AppApiWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end

  if Application.compile_env(:app_api, :dev_routes) do
    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
