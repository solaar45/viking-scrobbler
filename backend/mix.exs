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
    {:phoenix_ecto, "~> 4.7"},
    {:ecto_sql, "~> 3.13"},
    {:ecto_sqlite3, "~> 0.17"},
    {:phoenix_html, "~> 4.3"},
    {:phoenix_live_reload, "~> 1.5", only: :dev},
    {:phoenix_live_view, "~> 1.1"},
    {:phoenix_live_dashboard, "~> 0.8"},
    {:swoosh, "~> 1.19"},
    {:finch, "~> 0.20"},
    {:telemetry_metrics, "~> 1.1"},
    {:telemetry_poller, "~> 1.3"},
    {:gettext, "~> 0.26"},
    {:jason, "~> 1.4"},
    {:dns_cluster, "~> 0.1"},
    {:bandit, "~> 1.9"},
    {:cors_plug, "~> 3.0"},
    {:httpoison, "~> 2.3"},       # ← NUR DIESE EINE ZEILE
    {:oban, "~> 2.17"},
    {:quantum, "~> 3.5"},
    {:csv, "~> 3.2"} # CSV encoding/decoding
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
