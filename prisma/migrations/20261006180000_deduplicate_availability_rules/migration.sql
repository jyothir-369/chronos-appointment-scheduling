DELETE FROM availability_rules
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY provider_id, day_of_week, start_time, end_time
        ORDER BY created_at ASC, id ASC
      ) AS row_number
    FROM availability_rules
  ) ranked
  WHERE row_number > 1
);

CREATE UNIQUE INDEX "availability_rules_provider_id_day_of_week_start_time_end_time_key"
ON "availability_rules" (
  "provider_id",
  "day_of_week",
  "start_time",
  "end_time"
);
