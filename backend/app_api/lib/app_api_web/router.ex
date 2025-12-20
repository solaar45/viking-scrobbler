defmodule AppApiWeb.Router do
  use AppApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  # API Routes
  scope "/api", AppApiWeb do
    pipe_through :api
    get "/health", HealthController, :index
  end

  # Frontend - alle anderen Routes
  scope "/", AppApiWeb do
    get "/*path", FrontendController, :index
  end

  if Application.compile_env(:app_api, :dev_routes) do
    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
