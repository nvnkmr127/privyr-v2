-- Automations predate tenant scoping (no organization_id) and fired across every org's leads.
-- There is no correct org to backfill onto, so drop the pre-tenancy rows (children first for FKs)
-- before enforcing NOT NULL. Re-create automations after migrating.
DELETE FROM "automation_runs";--> statement-breakpoint
DELETE FROM "automation_actions";--> statement-breakpoint
DELETE FROM "automation_conditions";--> statement-breakpoint
DELETE FROM "automation_triggers";--> statement-breakpoint
DELETE FROM "automations";--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automations_org_idx" ON "automations" USING btree ("organization_id");