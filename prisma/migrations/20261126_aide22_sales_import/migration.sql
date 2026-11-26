-- AIDE-22: allow historical sales imports to be recorded as auditable batches.
ALTER TYPE "ImportEntity" ADD VALUE IF NOT EXISTS 'SALES';
