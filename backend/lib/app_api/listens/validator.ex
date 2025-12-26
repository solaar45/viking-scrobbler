defmodule AppApi.Listens.Validator do
  @moduledoc """
  Validates listens according to ListenBrainz scrobble rules:

  - A listen is valid if played for at least 50% of track duration OR 4 minutes (whichever is LOWER)
  - Automatically calculates skip status and percentage

  IMPORTANT: This module operates in MILLISECONDS (ms) internally.
  """

  # Constants matching ListenBrainz specification
  # 4 minutes in ms
  @min_duration_ms 240_000
  # 50%
  @min_percentage 0.5

  @typedoc """
  Validation result for a listen (ms-based for duration fields).
  """
  @type validation_result :: %{
          is_valid: boolean(),
          is_skipped: boolean(),
          scrobble_percentage: float(),
          skip_reason: String.t() | nil,
          required_duration: integer(),
          played_duration: integer(),
          duration: integer() | nil
        }

  @doc """
  Validates a listen based on duration and played_duration (both in ms).

  ## Rules (ListenBrainz compatible):
  - Track 3:00 long → needs 1:30 min (50%)
  - Track 10:00 long → needs 4:00 min (NOT 5:00!)
  - Unknown duration → assume valid
  """
  @spec validate_listen(integer() | nil, integer() | nil) :: validation_result()
  def validate_listen(duration_ms, played_ms)

  # Case 1: Unknown duration → assume valid
  def validate_listen(nil, played_ms) when is_integer(played_ms) do
    %{
      is_valid: true,
      is_skipped: false,
      scrobble_percentage: 100.0,
      skip_reason: nil,
      required_duration: 0,
      played_duration: played_ms,
      duration: nil
    }
  end

  # Case 2: Duration known, played missing → assume fully played
  def validate_listen(duration_ms, nil) when is_integer(duration_ms) do
    validate_listen(duration_ms, duration_ms)
  end

  # Case 3: Both present (ms) → apply rule
  def validate_listen(duration_ms, played_ms)
      when is_integer(duration_ms) and is_integer(played_ms) and duration_ms > 0 do
    # ListenBrainz Rule: min(50% of duration, 4 minutes)
    required_ms = min(round(duration_ms * @min_percentage), @min_duration_ms)

    # Percentage (can be > 100 for loops)
    percentage = played_ms / duration_ms * 100.0

    is_valid = played_ms >= required_ms

    skip_reason =
      cond do
        is_valid ->
          nil

        # Long track (>= 8 min) and under 4 min played
        duration_ms >= @min_duration_ms * 2 and played_ms < @min_duration_ms ->
          "duration_threshold"

        # Under 50% played
        played_ms < round(duration_ms * @min_percentage) ->
          "percentage_threshold"

        true ->
          "unknown"
      end

    %{
      is_valid: is_valid,
      is_skipped: !is_valid,
      scrobble_percentage: Float.round(percentage, 2),
      skip_reason: skip_reason,
      required_duration: required_ms,
      played_duration: played_ms,
      duration: duration_ms
    }
  end

  # Case 4: Invalid inputs → fail-safe
  def validate_listen(_duration_ms, _played_ms) do
    %{
      is_valid: true,
      is_skipped: false,
      scrobble_percentage: 100.0,
      skip_reason: "validation_error",
      required_duration: 0,
      played_duration: 0,
      duration: 0
    }
  end

  @doc """
  Convenience function to validate from a map (listen struct or attrs).

  Accepts seconds OR ms fields, normalizes to ms before validation.
  """
  @spec validate_from_map(map()) :: validation_result()
  def validate_from_map(attrs) when is_map(attrs) do
    duration_ms =
      attrs[:duration_ms] ||
        attrs["duration_ms"] ||
        seconds_to_ms(attrs[:duration]) ||
        seconds_to_ms(attrs["duration"]) ||
        nil

    played_ms =
      attrs[:played_duration] ||
        attrs["played_duration"] ||
        attrs[:played_duration_ms] ||
        attrs["played_duration_ms"] ||
        nil

    validate_listen(duration_ms, played_ms)
  end

  @doc """
  Batch validate multiple listens.
  """
  @spec validate_batch([map()]) :: [validation_result()]
  def validate_batch(listens) when is_list(listens) do
    Enum.map(listens, &validate_from_map/1)
  end

  # ===== Helpers =====

  defp seconds_to_ms(nil), do: nil
  defp seconds_to_ms(s) when is_integer(s) and s > 0, do: s * 1000
  defp seconds_to_ms(_), do: nil

  @doc """
  Get human-readable explanation of skip reason.
  """
  @spec explain_skip_reason(String.t() | nil) :: String.t()
  def explain_skip_reason(nil), do: "Listen is valid"
  def explain_skip_reason("percentage_threshold"), do: "Played less than 50% of track"
  def explain_skip_reason("duration_threshold"), do: "Played less than 4 minutes of long track"
  def explain_skip_reason("manual"), do: "Manually marked as skipped"
  def explain_skip_reason("validation_error"), do: "Could not validate (missing data)"
  def explain_skip_reason(other), do: "Unknown reason: #{other}"

  @doc """
  Calculate required duration for a track to be valid (expects duration in ms).
  """
  @spec required_duration_for_track(integer()) :: integer()
  def required_duration_for_track(duration_ms) when is_integer(duration_ms) and duration_ms > 0 do
    min(round(duration_ms * @min_percentage), @min_duration_ms)
  end

  def required_duration_for_track(_), do: 0
end
