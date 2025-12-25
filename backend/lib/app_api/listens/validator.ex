defmodule AppApi.Listens.Validator do
  @moduledoc """
  Validates listens according to ListenBrainz scrobble rules:
  - A listen is valid if played for at least 50% of track duration OR 4 minutes (whichever is LOWER)
  - Automatically calculates skip status and percentage
  """

  # Constants matching ListenBrainz specification
  @min_duration_seconds 240  # 4 Minuten
  @min_percentage 0.5        # 50%

  @typedoc """
  Validation result for a listen
  """
  @type validation_result :: %{
    is_valid: boolean(),
    is_skipped: boolean(),
    scrobble_percentage: float(),
    skip_reason: String.t() | nil,
    required_duration: integer(),
    played_duration: integer(),
    duration: integer()
  }

  @doc """
  Validates a listen based on duration and played_duration.

  ## Rules (ListenBrainz compatible):
  - Track 3:00 long → needs 1:30 min (50%)
  - Track 10:00 long → needs 4:00 min (NOT 5:00!)
  - Track 2:00 long → needs 1:00 min (50%)

  ## Examples

      iex> validate_listen(180, 100)
      %{is_valid: true, is_skipped: false, scrobble_percentage: 55.56, ...}

      iex> validate_listen(600, 120)
      %{is_valid: false, is_skipped: true, skip_reason: "duration_threshold", ...}

      iex> validate_listen(nil, 120)
      %{is_valid: true, is_skipped: false, scrobble_percentage: 100.0, ...}  # Unknown duration = assume valid
  """
  @spec validate_listen(integer() | nil, integer() | nil) :: validation_result()
  def validate_listen(duration, played_duration)

  # Case 1: Keine Duration bekannt → als valid markieren (Fallback)
  def validate_listen(nil, played_duration) when is_integer(played_duration) do
    %{
      is_valid: true,
      is_skipped: false,
      scrobble_percentage: 100.0,
      skip_reason: nil,
      required_duration: 0,
      played_duration: played_duration,
      duration: nil
    }
  end

  # Case 2: Duration bekannt, aber played_duration fehlt → als valid + volle Dauer annehmen
  def validate_listen(duration, nil) when is_integer(duration) do
    validate_listen(duration, duration)
  end

  # Case 3: Beide Werte vorhanden → ListenBrainz-Regel anwenden
  def validate_listen(duration, played_duration)
      when is_integer(duration) and is_integer(played_duration) and duration > 0 do

    # ListenBrainz Rule: min(50% of duration, 240 seconds)
    required_duration = min(round(duration * @min_percentage), @min_duration_seconds)

    # Scrobble Percentage (0-100, kann > 100 sein bei Loops)
    percentage = (played_duration / duration * 100)

    # Validation
    is_valid = played_duration >= required_duration

    # Skip Reason - KORRIGIERT: Prüfe duration_threshold ZUERST
    skip_reason = cond do
      is_valid ->
        nil

      # Fall 1: Langer Track (>=8 min) UND unter 4 Min gespielt
      duration >= @min_duration_seconds * 2 and played_duration < @min_duration_seconds ->
        "duration_threshold"

      # Fall 2: Unter 50% gespielt (Standard-Fall)
      played_duration < round(duration * @min_percentage) ->
        "percentage_threshold"

      true ->
        "unknown"
    end

    %{
      is_valid: is_valid,
      is_skipped: !is_valid,
      scrobble_percentage: Float.round(percentage, 2),
      skip_reason: skip_reason,
      required_duration: required_duration,
      played_duration: played_duration,
      duration: duration
    }
  end

  # Case 4: Ungültige Inputs → Error-Fallback
  def validate_listen(_duration, _played_duration) do
    %{
      is_valid: true,  # Fail-safe: bei Fehler als valid markieren
      is_skipped: false,
      scrobble_percentage: 100.0,
      skip_reason: "validation_error",
      required_duration: 0,
      played_duration: 0,
      duration: 0
    }
  end

  @doc """
  Convenience function to validate from a map (e.g. listen struct or attrs)

  ## Examples

      iex> validate_from_map(%{duration: 180, played_duration: 100})
      %{is_valid: true, is_skipped: false, ...}

      iex> validate_from_map(%{duration_ms: 180000, played_duration: 100})
      %{is_valid: true, is_skipped: false, ...}
  """
  @spec validate_from_map(map()) :: validation_result()
  def validate_from_map(attrs) when is_map(attrs) do
    # Try to extract duration (prefer seconds, fallback to ms) - KORRIGIERT
    duration =
      attrs[:duration] ||
      attrs["duration"] ||
      ms_to_seconds(attrs[:duration_ms]) ||
      ms_to_seconds(attrs["duration_ms"]) ||
      nil

    # Try to extract played_duration
    played_duration =
      attrs[:played_duration] ||
      attrs["played_duration"] ||
      ms_to_seconds(attrs[:played_duration_ms]) ||
      ms_to_seconds(attrs["played_duration_ms"]) ||
      nil

    validate_listen(duration, played_duration)
  end

  @doc """
  Batch validate multiple listens

  ## Examples

      iex> validate_batch([
      ...>   %{duration: 180, played_duration: 100},
      ...>   %{duration: 600, played_duration: 120}
      ...> ])
      [
        %{is_valid: true, ...},
        %{is_valid: false, skip_reason: "duration_threshold", ...}
      ]
  """
  @spec validate_batch([map()]) :: [validation_result()]
  def validate_batch(listens) when is_list(listens) do
    Enum.map(listens, &validate_from_map/1)
  end

  # ===== HELPER FUNCTIONS =====

  defp ms_to_seconds(nil), do: nil
  defp ms_to_seconds(ms) when is_integer(ms), do: div(ms, 1000)
  defp ms_to_seconds(_), do: nil

  @doc """
  Get human-readable explanation of skip reason
  """
  @spec explain_skip_reason(String.t() | nil) :: String.t()
  def explain_skip_reason(nil), do: "Listen is valid"
  def explain_skip_reason("percentage_threshold"),
    do: "Played less than 50% of track"
  def explain_skip_reason("duration_threshold"),
    do: "Played less than 4 minutes of long track"
  def explain_skip_reason("manual"),
    do: "Manually marked as skipped"
  def explain_skip_reason("validation_error"),
    do: "Could not validate (missing data)"
  def explain_skip_reason(other),
    do: "Unknown reason: #{other}"

  @doc """
  Calculate required duration for a track to be valid
  """
  @spec required_duration_for_track(integer()) :: integer()
  def required_duration_for_track(duration) when is_integer(duration) and duration > 0 do
    min(round(duration * @min_percentage), @min_duration_seconds)
  end
  def required_duration_for_track(_), do: 0
end
