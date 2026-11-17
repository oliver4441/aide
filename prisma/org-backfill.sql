-- AIDE-02 — Organisation hierarchy backfill
-- ---------------------------------------------------------------
-- Gives every existing single-business account a parent Organization
-- so the new tenant model (Organization -> Business -> ... ) is
-- populated for legacy data.
--
-- DEPLOY ORDER
--   1. `npx prisma db push`   -- creates the new tables and the nullable
--                                business."organizationId" FK column from the
--                                updated schema.prisma.
--   2. `psql "$DATABASE_URL" -f prisma/org-backfill.sql`
--
-- This script is idempotent: re-running it is a no-op once every Business has
-- an Organization. It does NOT drop or alter column nullability — the
-- organizationId column stays nullable until AIDE-03 enforces org scoping
-- application-side (see docs/architecture/org-hierarchy.md).

BEGIN;

-- 1. One Organization per existing Business (1:1). Use the Business slug as
--    the Org slug so the linkage below is deterministic, and because slugs are
--    already unique per Business.
INSERT INTO "Organization" ("id", "name", "legalName", "slug", "taxId", "baseCurrency", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  b."name",
  b."name",
  b."slug",
  NULL,
  b."currency",
  'ACTIVE',
  now(),
  now()
FROM "Business" b
WHERE NOT EXISTS (
  SELECT 1 FROM "Organization" o WHERE o."slug" = b."slug"
);

-- 2. Link each Business to its Organization by slug.
UPDATE "Business" b
SET "organizationId" = o."id"
FROM "Organization" o
WHERE b."organizationId" IS NULL
  AND o."slug" = b."slug";

COMMIT;
