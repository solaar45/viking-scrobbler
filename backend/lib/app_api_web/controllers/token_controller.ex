defmodule AppApiWeb.TokenController do
  use AppApiWeb, :controller
  alias AppApi.Repo
  alias AppApi.UserToken
  alias AppApi.DateTimeHelper
  import Ecto.Query
  require Logger

  # Generate new token
  def create(conn, params) do
    user_name = params["user_name"] || "viking_user"
    description = params["description"] || "Navidrome Token"

    token = UserToken.generate_token()

    attrs = %{
      token: token,
      user_name: user_name,
      description: description,
      active: true
    }

    case Repo.insert(UserToken.changeset(%UserToken{}, attrs)) do
      {:ok, user_token} ->
        json(conn, %{
          status: "ok",
          token: %{
            id: user_token.id,
            token: user_token.token,
            user_name: user_token.user_name,
            description: user_token.description,
            created_at: user_token.inserted_at,
            last_used: user_token.last_used
          }
        })

      {:error, changeset} ->
        conn
        |> put_status(:bad_request)
        |> json(%{status: "error", errors: format_errors(changeset)})
    end
  end

  # List all tokens
  def index(conn, _params) do
    tokens =
      UserToken
      |> where([t], t.active == true)
      |> order_by(desc: :inserted_at)
      |> Repo.all()
      |> Enum.map(&format_token/1)

    json(conn, %{status: "ok", tokens: tokens})
  end

  # Get single token
  def show(conn, %{"id" => id}) do
    case Repo.get(UserToken, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{status: "error", message: "Token not found"})

      token ->
        json(conn, %{status: "ok", token: format_token(token)})
    end
  end

  # Update token (description only)
  def update(conn, %{"id" => id} = params) do
    case Repo.get(UserToken, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{status: "error", message: "Token not found"})

      token ->
        attrs = %{description: params["description"]}

        case Repo.update(UserToken.changeset(token, attrs)) do
          {:ok, updated_token} ->
            json(conn, %{status: "ok", token: format_token(updated_token)})

          {:error, changeset} ->
            conn
            |> put_status(:bad_request)
            |> json(%{status: "error", errors: format_errors(changeset)})
        end
    end
  end

  # Delete token
  def delete(conn, %{"id" => id}) do
    case Repo.get(UserToken, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{status: "error", message: "Token not found"})

      token ->
        Repo.delete(token)
        json(conn, %{status: "ok", message: "Token deleted"})
    end
  end

  # Validate token (internal use by ListenBrainz)
  def validate(nil), do: {:error, "No token provided"}

  def validate(token_string) do
    case Repo.get_by(UserToken, token: token_string, active: true) do
      nil ->
        {:error, "Invalid token"}

      token ->
        # Update last_used timestamp mit sauberem DateTime
        token
        |> UserToken.changeset(%{last_used: DateTimeHelper.utc_now()})
        |> Repo.update()

        {:ok, token.user_name}
    end
  end

  # Private helpers

  defp format_token(token) do
    %{
      id: token.id,
      token: token.token,
      user_name: token.user_name,
      description: token.description,
      active: token.active,
      created_at: token.inserted_at,
      last_used: token.last_used
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
