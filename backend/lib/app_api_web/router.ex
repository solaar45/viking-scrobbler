defmodule AppApiWeb.Router do
  use AppApiWeb, :router

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :api do
    plug(:accepts, ["json"])
    # ✅ CORS mit OPTIONS-Support
    plug(CORSPlug,
      origin: ["*"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      headers: ["Authorization", "Content-Type", "Accept"]
    )
  end

  # --- API ROUTES ---
  scope "/api", AppApiWeb do
    pipe_through(:api)

    get("/health", HealthController, :index)

    resources("/tokens", TokenController, only: [:index, :show, :create, :update, :delete])

    # Navidrome Setup
    post("/navidrome/connect", NavidromeController, :connect)
    get("/navidrome/status", NavidromeController, :status)
    delete("/navidrome/disconnect", NavidromeController, :disconnect)

    # Export/Import
    get("/export/listens", ExportController, :export_listens)
    post("/import", ListenBrainzController, :import_listens)

    # Metadata Enrichment
    get("/enrichment/scan", EnrichmentController, :scan)
    post("/enrichment/start", EnrichmentController, :start)
  end

  # --- ListenBrainz API v1 ---
  scope "/1", AppApiWeb do
    pipe_through(:api)

    post("/submit-listens", ListenBrainzController, :submit_listens)
    get("/user/:user_name/listens", ListenBrainzController, :get_listens)
    get("/user/:user_name/recent-listens", ListenBrainzController, :get_recent_listens)
    get("/stats/user/:user_name/artists", ListenBrainzController, :get_user_artists)
    get("/stats/user/:user_name/recordings", ListenBrainzController, :get_user_recordings)

    get(
      "/stats/user/:user_name/listening-activity",
      ListenBrainzController,
      :get_listening_activity
    )

    get("/stats/user/:user_name/totals", ListenBrainzController, :get_user_totals)
    get("/validate-token", ListenBrainzController, :validate_token)
  end

  # --- FRONTEND / THEME SWITCH ---
  scope "/", AppApiWeb do
    pipe_through(:browser)

    get("/switch", FrontendController, :switch_theme)
    get("/*path", FrontendController, :index)
  end

  if Application.compile_env(:app_api, :dev_routes) do
    scope "/dev" do
      pipe_through([:fetch_session, :protect_from_forgery])
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end
end
