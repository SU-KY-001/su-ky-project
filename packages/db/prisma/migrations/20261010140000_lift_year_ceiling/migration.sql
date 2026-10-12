-- Phases and periods now extend to the present, so the 1945 upper bound is lifted.
-- Year zero stays invalid; the SMALLINT column type remains the only upper limit.
ALTER TABLE "series" DROP CONSTRAINT "series_start_year_check",
  DROP CONSTRAINT "series_end_year_check",
  ADD CONSTRAINT "series_start_year_check" CHECK ("start_year" IS NULL OR "start_year" <> 0),
  ADD CONSTRAINT "series_end_year_check" CHECK ("end_year" IS NULL OR "end_year" <> 0);

ALTER TABLE "historical_periods" DROP CONSTRAINT "historical_periods_start_year_check",
  DROP CONSTRAINT "historical_periods_end_year_check",
  ADD CONSTRAINT "historical_periods_start_year_check" CHECK ("start_year" IS NULL OR "start_year" <> 0),
  ADD CONSTRAINT "historical_periods_end_year_check" CHECK ("end_year" IS NULL OR "end_year" <> 0);

ALTER TABLE "historical_phases"
  ADD CONSTRAINT "historical_phases_start_year_check" CHECK ("start_year" IS NULL OR "start_year" <> 0),
  ADD CONSTRAINT "historical_phases_end_year_check" CHECK ("end_year" IS NULL OR "end_year" <> 0);
