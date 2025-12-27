# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :app_api,
  ecto_repos: [AppApi.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configure the endpoint
config :app_api, AppApiWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: AppApiWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: AppApi.PubSub,
  live_view: [signing_salt: "9ygAM+8Q"]

# Configure the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :app_api, AppApi.Mailer, adapter: Swoosh.Adapters.Local

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"

config :app_api,
  navidrome_url: System.get_env("NAVIDROME_URL") || "http://localhost:4533",
  navidrome_username: System.get_env("NAVIDROME_USERNAME") || "admin",
  navidrome_password: System.get_env("NAVIDROME_PASSWORD") || "password"

# Cover caching configuration
config :app_api,
  cover_max_bytes: String.to_integer(System.get_env("COVER_MAX_BYTES") || "500000"),
  cover_retention_days: String.to_integer(System.get_env("COVER_RETENTION_DAYS") || "90")

# Oban periodic jobs (enqueue cover caching + cleanup)
config :app_api, Oban,
  repo: AppApi.Repo,
  queues: [default: 10, maintenance: 2],
  plugins: [Oban.Plugins.Pruner, {Oban.Plugins.Cron, crontab: [
    {"@hourly", AppApi.Workers.EnqueueMissingCoversWorker, args: %{}},
    {"@daily", AppApi.Workers.CleanupCoverCacheWorker, args: %{}}
  ]}]

# Alternativ für Production (runtime.exs):
# config :app_api,
#   navidrome_url: System.fetch_env!("NAVIDROME_URL"),
#   navidrome_username: System.fetch_env!("NAVIDROME_USERNAME"),
#   navidrome_password: System.fetch_env!("NAVIDROME_PASSWORD")
