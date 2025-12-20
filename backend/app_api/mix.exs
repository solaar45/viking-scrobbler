defmodule AppApi.MixProject do
  use Mix.Project

  def project do
    [
      app: :app_api,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  def application do
    [
      mod: {AppApi.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
  [
    {:phoenix, "~> 1.7.21"},
    {:phoenix_ecto, "~> 4.6"},
    {:ecto_sql, "~> 3.12"},
    {:ecto_sqlite3, "~> 0.17.2"},
    {:phoenix_live_dashboard, "~> 0.8.5"},
    {:swoosh, "~> 1.5"},
    {:finch, "~> 0.13"},
    {:telemetry_metrics, "~> 1.0"},
    {:telemetry_poller, "~> 1.0"},
    {:gettext, "~> 0.20"},              # ✅ HINZUFÜGEN
    {:jason, "~> 1.2"},
    {:dns_cluster, "~> 0.1.1"},
    {:bandit, "~> 1.6"},
    {:cors_plug, "~> 3.0"}
  ]
end


  defp aliases do
    [
      setup: ["deps.get", "ecto.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"]
    ]
  end
end
