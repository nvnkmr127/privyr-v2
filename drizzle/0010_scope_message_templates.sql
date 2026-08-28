ALTER TABLE "message_templates" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: when exactly one org exists, adopt orphaned templates into it.
UPDATE "message_templates" SET "organization_id" = (SELECT "id" FROM "organizations" LIMIT 1) WHERE "organization_id" IS NULL AND (SELECT count(*) FROM "organizations") = 1;