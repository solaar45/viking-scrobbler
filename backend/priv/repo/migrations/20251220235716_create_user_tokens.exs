defmodule AppApi.Repo.Migrations.CreateUserTokens do
  use Ecto.Migration

  def change do
    create table(:user_tokens) do
      add :token, :string, null: false
      add :user_name, :string, null: false
      add :description, :string
      add :active, :boolean, default: true
      add :last_used, :utc_datetime

      timestamps()
    end

    create unique_index(:user_tokens, [:token])
    create index(:user_tokens, [:user_name])
    create index(:user_tokens, [:active])
  end
end
