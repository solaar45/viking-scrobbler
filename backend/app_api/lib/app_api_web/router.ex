defmodule AppApiWeb.Router do
  use AppApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug CORSPlug, origin: ["*"]
  end

  # API Routes
  scope "/api", AppApiWeb do
    pipe_through :api
    
    get "/health", HealthController, :index
    
    # Token Management (RESTful)
    resources "/tokens", TokenController, only: [:index, :show, :create, :update, :delete]
  end

  # ListenBrainz API v1 (Standard)
scope "/1", AppApiWeb do
  pipe_through :api

  post "/submit-listens", ListenBrainzController, :submit_listens
  get "/user/:user_name/listens", ListenBrainzController, :get_listens
  get "/user/:user_name/recent-listens", ListenBrainzController, :get_recent_listens  # NEU
  get "/stats/user/:user_name/artists", ListenBrainzController, :get_user_artists
  get "/stats/user/:user_name/recordings", ListenBrainzController, :get_user_recordings
  get "/stats/user/:user_name/listening-activity", ListenBrainzController, :get_listening_activity
  get "/stats/user/:user_name/totals", ListenBrainzController, :get_user_totals  # NEU
  get "/validate-token", ListenBrainzController, :validate_token
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
