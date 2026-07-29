-- Deduplicate names before adding unique constraint (keep the oldest account per name)
WITH dupes AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "name" ORDER BY "createdAt" ASC) AS rn
  FROM "User"
  WHERE "name" IS NOT NULL
)
UPDATE "User" SET "name" = "name" || '_' || LEFT(id, 6)
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- Make username unique (NULL values are always distinct in PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS "User_name_key" ON "User"("name");
