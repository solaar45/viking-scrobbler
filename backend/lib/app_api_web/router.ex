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
    plug(CORSPlug,
      origin: ["*"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      headers: ["Authorization", "Content-Type", "Accept"]
    )
  end

  # ============================================================================
  # API ROUTES (Frontend)
  # ============================================================================
  scope "/api", AppApiWeb do
    pipe_through(:api)

    get("/health", HealthController, :index)

    # Token Management
    resources("/tokens", TokenController, only: [:index, :show, :create, :update, :delete])

    # Navidrome Integration
    post("/navidrome/connect", NavidromeController, :connect)
    get("/navidrome/status", NavidromeController, :status)
    delete("/navidrome/disconnect", NavidromeController, :disconnect)

    # Export/Import
    get("/export/listens", ExportController, :export_listens)
    post("/import/listens", ImportController, :import_listens)  # ← Import Controller

    # Metadata Enrichment
    get("/enrichment/scan", EnrichmentController, :scan)
    post("/enrichment/start", EnrichmentController, :start)

    # ═══════════════════════════════════════════════════════════
    # COVER ART PROXY (ID3 ONLY)
    # ═══════════════════════════════════════════════════════════
    get "/covers/:navidrome_id", CoverController, :show_by_navidrome_id
    get "/listens/:listen_id/cover", CoverController, :show_by_listen_id

    # ═══════════════════════════════════════════════════════════
    # STATS ENDPOINTS
    # ═══════════════════════════════════════════════════════════

    get "/stats/overview", StatsController, :overview
    get "/stats/top-artists", StatsController, :top_artists
    get "/stats/top-tracks", StatsController, :top_tracks
    get "/stats/top-albums", StatsController, :top_albums
    get "/stats/top-genres", StatsController, :top_genres
    get "/stats/top-years", StatsController, :top_years
    get "/stats/top-dates", StatsController, :top_dates
    get "/stats/top-times", StatsController, :top_times
    get "/stats/top-durations", StatsController, :top_durations
    get "/embedded-cover/:kind/:id", EmbeddedCoverController, :show

  end

  # ============================================================================
  # LISTENBRAINZ API v1 (Navidrome Scrobbling)
  # ============================================================================
  scope "/1", AppApiWeb do
    pipe_through(:api)

    # Scrobbling
    post("/submit-listens", ListenBrainzController, :submit_listens)

    # User Data
    get("/user/:user_name/listens", ListenBrainzController, :get_listens)
    get("/user/:user_name/recent-listens", ListenBrainzController, :get_recent_listens)

    # Statistics
    get("/stats/user/:user_name/artists", ListenBrainzController, :get_user_artists)
    get("/stats/user/:user_name/recordings", ListenBrainzController, :get_user_recordings)
    get("/stats/user/:user_name/listening-activity", ListenBrainzController, :get_listening_activity)
    get("/stats/user/:user_name/totals", ListenBrainzController, :get_user_totals)

    # Token Validation
    get("/validate-token", ListenBrainzController, :validate_token)
  end

  # ============================================================================
  # FRONTEND (SPA)
  # ============================================================================
  scope "/", AppApiWeb do
    pipe_through(:browser)

    get("/switch", FrontendController, :switch_theme)
    get("/*path", FrontendController, :index)
  end

  # ============================================================================
  # DEV ROUTES
  # ============================================================================
  if Application.compile_env(:app_api, :dev_routes) do
    scope "/dev" do
      pipe_through([:fetch_session, :protect_from_forgery])
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end
end
