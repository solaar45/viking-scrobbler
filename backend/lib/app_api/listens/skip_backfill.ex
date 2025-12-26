defmodule AppApi.Listens.SkipBackfill do
  @moduledoc "Backfills duration/skip fields for existing listens."

  import Ecto.Query
  require Logger

  alias AppApi.{Repo, Listen}
  alias AppApi.Listens.Validator

  def run(user_name \\ nil, limit \\ 5_000) do
    base =
      from(l in Listen,
        order_by: [desc: l.id],
        limit: ^limit
      )

    q =
      if is_binary(user_name) do
        from(l in base, where: l.user_name == ^user_name)
      else
        base
      end

    listens = Repo.all(q)

    updated =
      listens
      |> Enum.map(&backfill_one/1)
      |> Enum.count(&(&1 == :ok))

    Logger.info("✅ SkipBackfill done: updated=#{updated}/#{length(listens)}")
    updated
  end

  defp backfill_one(%Listen{} = l) do
    # Normalize duration to ms (preferred), fallback to seconds fields if needed.
    duration_ms =
      cond do
        is_integer(l.duration_ms) and l.duration_ms > 0 ->
          l.duration_ms

        is_integer(l.duration) and l.duration > 0 ->
          l.duration * 1000

        is_map(l.additional_info) and is_integer(l.additional_info["duration_ms"]) ->
          l.additional_info["duration_ms"]

        is_map(l.additional_info) and is_integer(l.additional_info["duration"]) ->
          l.additional_info["duration"] * 1000

        true ->
          nil
      end

    # Normalize played_duration to ms (some clients send seconds; we treat <1000 as seconds).
    played_duration_ms =
      cond do
        is_integer(l.played_duration) ->
          l.played_duration

        is_map(l.additional_info) and is_integer(l.additional_info["played_duration"]) ->
          v = l.additional_info["played_duration"]
          if v < 1000, do: v * 1000, else: v

        true ->
          nil
      end

    duration_s =
      if is_integer(duration_ms) and duration_ms > 0 do
        div(duration_ms, 1000)
      else
        nil
      end

    validation =
      if is_integer(duration_ms) and duration_ms > 0 do
        Validator.validate_listen(duration_ms, played_duration_ms)
      else
        nil
      end

    changes =
      %{}
      |> maybe_put(:duration_ms, duration_ms)
      |> maybe_put(:duration, duration_s)
      |> maybe_put(:played_duration, played_duration_ms)
      |> maybe_put(:is_skipped, validation && validation.is_skipped)
      |> maybe_put(:scrobble_percentage, validation && validation.scrobble_percentage)
      |> maybe_put(:skip_reason, validation && validation.skip_reason)

    if map_size(changes) == 0 do
      :skip
    else
      l
      |> Ecto.Changeset.change(changes)
      |> Repo.update()
      |> case do
        {:ok, _} -> :ok
        {:error, _} -> :error
      end
    end
  end

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, v)
end
