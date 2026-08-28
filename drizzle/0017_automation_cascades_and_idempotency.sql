ALTER TABLE "automation_triggers" DROP CONSTRAINT IF EXISTS "automation_triggers_automation_id_automations_id_fk";--> statement-breakpoint
ALTER TABLE "automation_triggers" ADD CONSTRAINT "automation_triggers_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "automation_conditions" DROP CONSTRAINT IF EXISTS "automation_conditions_automation_id_automations_id_fk";--> statement-breakpoint
ALTER TABLE "automation_conditions" ADD CONSTRAINT "automation_conditions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "automation_actions" DROP CONSTRAINT IF EXISTS "automation_actions_automation_id_automations_id_fk";--> statement-breakpoint
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "automation_runs" DROP CONSTRAINT IF EXISTS "automation_runs_automation_id_automations_id_fk";--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "automation_runs" DROP CONSTRAINT IF EXISTS "automation_runs_lead_id_leads_id_fk";--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_idempotency_key_unique" UNIQUE("idempotency_key");
