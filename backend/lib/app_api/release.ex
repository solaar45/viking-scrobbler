# backend/lib/app_api/release.ex
defmodule AppApi.Release do
  @app :app_api

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &run_migrations_for/1)
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.rollback(&1, version))
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp run_migrations_for(repo) do
    if loaded?(repo), do: {:all, repo}, else: Ecto.Migrator.run(repo, :up, all: true)
  end

  defp loaded?(repo), do: Code.ensure_loaded?(repo)

  defp load_app do
    Application.load(@app)
  end
end
