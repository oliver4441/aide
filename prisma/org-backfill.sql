-- AIDE-02 — Organisation hierarchy backfill + NOT NULL hardening
-- ------------------------------------------------------------------
-- Gives every existing single-business account a parent Organization and
-- tightens business."organizationId" to NOT NULL so the tenant model is
-- enforced at the database level. New accounts already create their own
-- Organization in the register / "create my business" / reviews flows, so
-- this only needs to cover legacy rows.
--
-- IDEMPOTENT: safe to run more than once. On a fresh database (tables not yet
-- created) run `npx prisma db push` first; on a database that already holds
-- Business rows you may run this script first (it adds the column safely) and
-- then `prisma db push` to reconcile the rest of the schema. Both steps are
-- repeatable.
--
-- Recommended deploy order (either works):
--   A) npx prisma db push
--      psql "$DATABASE_URL" -f prisma/org-backfill.sql
--   B) psql "$DATABASE_URL" -f prisma/org-backfill.sql
--      npx prisma db push
-- If `prisma db push` refuses to add a NOT NULL column to a populated table,
-- use order (B).

BEGIN;

-- Make sure we can generate IDs on older Postgres too (no-op on pg13+ where
-- gen_random_uuid() is part of core).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0. Ensure the column exists as nullable. No-op if db push already created it.
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "organizationId" text;

-- 1. One Organization per existing Business (1:1), keyed on the existing unique
--    Business slug so the linkage below is deterministic.
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

-- 3. The column is now fully populated, so enforce NOT NULL.
ALTER TABLE "Business" ALTER COLUMN "organizationId" SET NOT NULL;

-- 4. Add the foreign key if it is not already present. prisma db push creates
--    the same constraint (name Business_organizationId_fkey, ON DELETE RESTRICT);
--    the guard keeps this script idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Business_organizationId_fkey'
  ) THEN
    ALTER TABLE "Business"
      ADD CONSTRAINT "Business_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
