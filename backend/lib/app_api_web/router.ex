defmodule AppApiWeb.Router do
  use AppApiWeb, :router

  # Browser-Pipeline: minimal, nur für Cookies & HTML-Auslieferung der SPA
  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(CORSPlug, origin: ["*"])
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
  end

  # --- ListenBrainz API v1 ---
  scope "/1", AppApiWeb do
    pipe_through(:api)

    # Core ListenBrainz Endpoints
    post("/submit-listens", ListenBrainzController, :submit_listens)
    get("/user/:user_name/listens", ListenBrainzController, :get_listens)
    get("/user/:user_name/recent-listens", ListenBrainzController, :get_recent_listens)
    get("/validate-token", ListenBrainzController, :validate_token)

    # Stats Endpoints
    get("/stats/user/:user_name/artists", ListenBrainzController, :get_user_artists)
    get("/stats/user/:user_name/recordings", ListenBrainzController, :get_user_recordings)

    get(
      "/stats/user/:user_name/listening-activity",
      ListenBrainzController,
      :get_listening_activity
    )

    get("/stats/user/:user_name/totals", ListenBrainzController, :get_user_totals)

    # ===== NEU: SKIP-DETECTION ENDPOINTS =====
    get("/listens/:id/validation", ListenBrainzController, :validation)
    get("/stats/user/:user_name/skip-summary", ListenBrainzController, :skip_summary)
    get("/user/:user_name/listens/recent", ListenBrainzController, :get_recent_listens_filtered)
  end

  # --- FRONTEND / THEME SWITCH ---
  scope "/", AppApiWeb do
    pipe_through(:browser)

    # ?theme=flat|material → Cookie setzen
    get("/switch", FrontendController, :switch_theme)

    # Alle anderen Routen an die SPA (React)
    get("/*path", FrontendController, :index)
  end

  if Application.compile_env(:app_api, :dev_routes) do
    scope "/dev" do
      pipe_through([:fetch_session, :protect_from_forgery])
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end
end
