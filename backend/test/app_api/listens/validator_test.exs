defmodule AppApi.Listens.ValidatorTest do
  use ExUnit.Case, async: true
  alias AppApi.Listens.Validator

  describe "validate_listen/2" do
    test "track 3 min (180s) needs 90s (50%)" do
      result = Validator.validate_listen(180, 90)

      assert result.is_valid == true
      assert result.is_skipped == false
      assert result.scrobble_percentage == 50.0
      assert result.required_duration == 90
    end

    test "track 3 min (180s) with only 80s is skipped" do
      result = Validator.validate_listen(180, 80)

      assert result.is_valid == false
      assert result.is_skipped == true
      assert result.skip_reason == "percentage_threshold"
    end

    test "track 10 min (600s) needs 240s (4 min, NOT 5 min!)" do
      result = Validator.validate_listen(600, 240)

      assert result.is_valid == true
      assert result.is_skipped == false
      # min(300, 240) = 240
      assert result.required_duration == 240
    end

    test "track 10 min (600s) with only 200s is skipped" do
      result = Validator.validate_listen(600, 200)

      assert result.is_valid == false
      assert result.is_skipped == true
      assert result.skip_reason == "duration_threshold"
    end

    test "unknown duration defaults to valid" do
      result = Validator.validate_listen(nil, 120)

      assert result.is_valid == true
      assert result.is_skipped == false
      assert result.scrobble_percentage == 100.0
    end

    test "missing played_duration assumes full track" do
      result = Validator.validate_listen(180, nil)

      assert result.is_valid == true
      assert result.scrobble_percentage == 100.0
    end
  end

  describe "validate_from_map/1" do
    test "extracts duration from duration_ms" do
      result =
        Validator.validate_from_map(%{
          duration_ms: 180_000,
          played_duration: 100
        })

      assert result.duration == 180
      assert result.is_valid == true
    end

    test "prefers duration over duration_ms" do
      result =
        Validator.validate_from_map(%{
          duration: 200,
          duration_ms: 180_000,
          played_duration: 100
        })

      assert result.duration == 200
    end
  end

  describe "required_duration_for_track/1" do
    test "3 min track needs 90s" do
      assert Validator.required_duration_for_track(180) == 90
    end

    test "10 min track needs 240s (not 300s)" do
      assert Validator.required_duration_for_track(600) == 240
    end

    test "2 min track needs 60s" do
      assert Validator.required_duration_for_track(120) == 60
    end
  end
end
