ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "required_lead_fields" jsonb DEFAULT '["name"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: grant the shared admin role its full permission set.
UPDATE "roles" SET "permissions" = '["users.manage","roles.manage","settings.manage","sources.manage","templates.manage","leads.delete"]'::jsonb WHERE "name" = 'admin' AND "organization_id" IS NULL;--> statement-breakpoint
-- Backfill: when exactly one org exists, adopt orphaned users/teams (from the pre-scoping bug) into it.
UPDATE "users" SET "organization_id" = (SELECT "id" FROM "organizations" LIMIT 1) WHERE "organization_id" IS NULL AND (SELECT count(*) FROM "organizations") = 1;--> statement-breakpoint
UPDATE "teams" SET "organization_id" = (SELECT "id" FROM "organizations" LIMIT 1) WHERE "organization_id" IS NULL AND (SELECT count(*) FROM "organizations") = 1;