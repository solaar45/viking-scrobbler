defmodule AppApi.Stats do
  @moduledoc """
  Statistics calculations for user listening data
  """

  import Ecto.Query
  alias AppApi.Repo
  alias AppApi.Listen

  @doc """
  Get the most active day of the week for a user
  Returns {weekday_name, scrobble_count}

  ## Parameters
    - user_id: Username to calculate stats for
    - from_timestamp: Optional Unix timestamp to filter from (nil = all time)

  ## Examples
      iex> Stats.most_active_day("viking_user")
      {"Friday", 142}

      iex> Stats.most_active_day("viking_user", 1703203200)
      {"Saturday", 89}
  """
  def most_active_day(user_id, from_timestamp \\ nil) do
    query =
      from(l in Listen,
        where: l.user_name == ^user_id,
        select: {
          fragment("strftime('%w', datetime(?, 'unixepoch'))", l.listened_at),
          count(l.id)
        },
        group_by: fragment("strftime('%w', datetime(?, 'unixepoch'))", l.listened_at),
        order_by: [desc: count(l.id)],
        limit: 1
      )

    query =
      if from_timestamp do
        from(l in query, where: l.listened_at >= ^from_timestamp)
      else
        query
      end

    case Repo.one(query) do
      {weekday_num, count} ->
        weekday_name = weekday_number_to_name(weekday_num)
        {weekday_name, count}

      nil ->
        {nil, 0}
    end
  end

  @doc """
  Calculate average scrobbles per day

  ## Parameters
    - user_id: Username to calculate stats for
    - from_timestamp: Optional Unix timestamp to filter from (nil = all time)

  ## Examples
      iex> Stats.avg_per_day("viking_user")
      23
  """
  def avg_per_day(user_id, from_timestamp \\ nil) do
    query = from(l in Listen, where: l.user_name == ^user_id)

    query =
      if from_timestamp do
        from(l in query, where: l.listened_at >= ^from_timestamp)
      else
        query
      end

    total_listens = Repo.aggregate(query, :count, :id)

    if total_listens == 0 do
      0
    else
      # Get first and last listen timestamps
      first_listen = Repo.one(from(l in query, select: min(l.listened_at)))
      last_listen = Repo.one(from(l in query, select: max(l.listened_at)))

      if first_listen && last_listen do
        days = div(last_listen - first_listen, 86400) + 1
        # Prevent division by zero
        days = max(days, 1)
        round(total_listens / days)
      else
        0
      end
    end
  end

  @doc """
  Get the peak day (single day with most scrobbles)
  Returns {date_string, scrobble_count}

  ## Parameters
    - user_id: Username to calculate stats for
    - from_timestamp: Optional Unix timestamp to filter from (nil = all time)

  ## Examples
      iex> Stats.peak_day("viking_user")
      {"22.12", 89}
  """
  def peak_day(user_id, from_timestamp \\ nil) do
    query =
      from(l in Listen,
        where: l.user_name == ^user_id,
        select: {
          fragment("date(?, 'unixepoch')", l.listened_at),
          count(l.id)
        },
        group_by: fragment("date(?, 'unixepoch')", l.listened_at),
        order_by: [desc: count(l.id)],
        limit: 1
      )

    query =
      if from_timestamp do
        from(l in query, where: l.listened_at >= ^from_timestamp)
      else
        query
      end

    case Repo.one(query) do
      {date_string, count} ->
        # Return full ISO date + count as map
        %{
          # "2025-12-22" (ISO-8601)
          date: date_string,
          count: count,
          # "22.12" für Fallback
          formatted: format_peak_date(date_string)
        }

      nil ->
        %{date: nil, count: 0, formatted: nil}
    end
  end

  @doc """
  Calculate current listening streak (consecutive days with listens)

  ## Parameters
    - user_id: Username to calculate streak for

  ## Examples
      iex> Stats.current_streak("viking_user")
      7
  """
  def current_streak(user_id) do
    # Get all distinct days with listens, ordered desc
    days_query =
      from(l in Listen,
        where: l.user_name == ^user_id,
        select: fragment("date(?, 'unixepoch')", l.listened_at),
        distinct: true,
        order_by: [desc: fragment("date(?, 'unixepoch')", l.listened_at)]
      )

    days = Repo.all(days_query)

    if length(days) == 0 do
      0
    else
      calculate_streak(days)
    end
  end

  # Private helper functions

  defp weekday_number_to_name(num) do
    case num do
      "0" -> "Sunday"
      "1" -> "Monday"
      "2" -> "Tuesday"
      "3" -> "Wednesday"
      "4" -> "Thursday"
      "5" -> "Friday"
      "6" -> "Saturday"
      _ -> nil
    end
  end

  defp format_peak_date(date_string) do
    case String.split(date_string, "-") do
      [_year, month, day] -> "#{day}.#{month}"
      _ -> date_string
    end
  end

  defp calculate_streak(days) do
    today = Date.utc_today() |> Date.to_string()

    # Check if the most recent day is today or yesterday
    [most_recent | rest] = days

    days_diff =
      Date.diff(
        Date.from_iso8601!(today),
        Date.from_iso8601!(most_recent)
      )

    # If last listen was more than 1 day ago, streak is broken
    if days_diff > 1 do
      0
    else
      count_consecutive_days([most_recent | rest], 1)
    end
  end

  defp count_consecutive_days([_day], streak), do: streak

  defp count_consecutive_days([day1, day2 | rest], streak) do
    diff =
      Date.diff(
        Date.from_iso8601!(day1),
        Date.from_iso8601!(day2)
      )

    if diff == 1 do
      count_consecutive_days([day2 | rest], streak + 1)
    else
      streak
    end
  end
end
