defmodule AppApi.DateTimeHelper do
  @moduledoc """
  Helper functions for safe datetime handling with SQLite
  """

  @doc """
  Returns current UTC datetime truncated to seconds (for insert_all)
  Returns DateTime for :utc_datetime fields
  """
  def utc_now do
    DateTime.utc_now() |> DateTime.truncate(:second)
  end

  @doc """
  Returns current time for insert_all operations
  Use this for inserted_at in insert_all
  """
  def utc_now_for_insert do
    DateTime.utc_now() |> DateTime.truncate(:second)
  end
end
