-- Per-tenant lead dedup enforced at the DB layer, replacing the application-level
-- check-then-insert (which races under concurrency). Partial unique indexes so that
-- soft-deleted rows (deleted_at set) and blank contacts do not collide.
--
-- NOTE: this will FAIL if the table already contains duplicate ACTIVE rows for a tenant.
-- Resolve existing duplicates first, e.g.:
--   SELECT organization_id, email, count(*) FROM leads
--   WHERE deleted_at IS NULL AND email <> '' GROUP BY 1,2 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS "leads_org_email_unique"
  ON "leads" ("organization_id","email")
  WHERE "deleted_at" IS NULL AND "email" IS NOT NULL AND "email" <> '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_org_phone_unique"
  ON "leads" ("organization_id","phone")
  WHERE "deleted_at" IS NULL AND "phone" IS NOT NULL AND "phone" <> '';
