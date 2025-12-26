defmodule AppApi.NavidromeCredential do
  use Ecto.Schema
  import Ecto.Changeset

  schema "navidrome_credentials" do
    field :user_name, :string
    field :url, :string
    field :username, :string
    field :encrypted_token, :string
    field :last_verified, :utc_datetime
    field :auto_discovered, :boolean, default: false

    # Virtual field für unverschlüsseltes Token
    field :token, :string, virtual: true

    timestamps()
  end

  def changeset(credential, attrs) do
    credential
    |> cast(attrs, [:user_name, :url, :username, :token, :last_verified, :auto_discovered])
    |> validate_required([:user_name, :url, :username, :token])
    |> unique_constraint([:user_name, :url])
    |> encrypt_token()
  end

  defp encrypt_token(changeset) do
    case get_change(changeset, :token) do
      nil ->
        changeset

      token when is_binary(token) ->
        encrypted = encrypt_value(token)

        changeset
        |> put_change(:encrypted_token, encrypted)
        |> delete_change(:token)
    end
  end

  def decrypt_token(%__MODULE__{encrypted_token: encrypted}) when is_binary(encrypted) do
    decrypt_value(encrypted)
  end

  def decrypt_token(_), do: nil

  # Encryption helpers
  defp encrypt_value(value) do
    secret = secret_key()
    iv = :crypto.strong_rand_bytes(16)

    {ciphertext, tag} =
      :crypto.crypto_one_time_aead(
        :aes_256_gcm,
        secret,
        iv,
        value,
        "",
        true
      )

    Base.encode64(iv <> tag <> ciphertext)
  end

  defp decrypt_value(encrypted) do
    secret = secret_key()

    case Base.decode64(encrypted) do
      {:ok, <<iv::binary-16, tag::binary-16, ciphertext::binary>>} ->
        case :crypto.crypto_one_time_aead(
               :aes_256_gcm,
               secret,
               iv,
               ciphertext,
               "",
               tag,
               false
             ) do
          plaintext when is_binary(plaintext) -> plaintext
          _ -> nil
        end

      _ ->
        nil
    end
  end

  defp secret_key do
    Application.get_env(:app_api, AppApiWeb.Endpoint)[:secret_key_base]
    |> binary_part(0, 32)
  end
end
