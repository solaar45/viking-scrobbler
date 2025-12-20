import Config

# Enable server
config :app_api, AppApiWeb.Endpoint, server: true

# Do not print debug messages in production
config :logger, level: :info

# Configures Swoosh API Client
config :swoosh, api_client: false, local: false

# Runtime production configuration, including reading
# of environment variables, is done in config/runtime.exs.
