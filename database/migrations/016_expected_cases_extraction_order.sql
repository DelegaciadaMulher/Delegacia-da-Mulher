BEGIN;

ALTER TABLE expected_cases
  ADD COLUMN IF NOT EXISTS extraction_order INTEGER;

WITH ranked_expected_cases AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY daily_import_id
      ORDER BY id ASC
    ) AS extraction_order
  FROM expected_cases
)
UPDATE expected_cases ec
SET extraction_order = ranked_expected_cases.extraction_order
FROM ranked_expected_cases
WHERE ec.id = ranked_expected_cases.id
  AND (ec.extraction_order IS NULL OR ec.extraction_order <= 0);

COMMIT;