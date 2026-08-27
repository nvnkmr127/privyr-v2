CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"role_id" uuid,
	"team_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "assignment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"team_id" uuid,
	"user_id" uuid,
	"type" varchar(50) DEFAULT 'source_direct' NOT NULL,
	"last_assigned_user_id" uuid,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(255),
	"is_active" integer DEFAULT 1 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"webhook_secret" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"old_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"changed_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_tags" (
	"lead_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(255),
	"email" varchar(255),
	"company" varchar(255),
	"source_id" uuid,
	"owner_id" uuid,
	"team_id" uuid,
	"pipeline_id" uuid,
	"stage_id" uuid,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"priority" varchar(50) DEFAULT 'medium',
	"score" integer DEFAULT 0,
	"expected_value" numeric(12, 2),
	"custom_data" jsonb DEFAULT '{}'::jsonb,
	"next_follow_up_at" timestamp,
	"last_contacted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid,
	"type" varchar(50) NOT NULL,
	"content" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"due_at" timestamp NOT NULL,
	"snoozed_until" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follow_up_id" uuid NOT NULL,
	"remind_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"order_index" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "automation_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"lead_id" uuid,
	"status" varchar(50) NOT NULL,
	"error" varchar(255),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"idempotency_key" varchar(255),
	"retry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"credentials" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_ingestion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"source_id" varchar(255) NOT NULL,
	"original_payload" jsonb,
	"status" varchar(50) NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"idempotency_key" varchar(255),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_log" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"channel" varchar(20) DEFAULT 'whatsapp' NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid,
	"direction" varchar(10) DEFAULT 'outbound' NOT NULL,
	"provider_message_id" varchar(255),
	"template_name" varchar(255),
	"body" text,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_id_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_id" varchar(255) NOT NULL,
	"legacy_type" varchar(100) NOT NULL,
	"new_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_source_id_lead_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."lead_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_last_assigned_user_id_users_id_fk" FOREIGN KEY ("last_assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_pipeline_stages" ADD CONSTRAINT "lead_pipeline_stages_pipeline_id_lead_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."lead_pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_status_history" ADD CONSTRAINT "lead_status_history_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_status_history" ADD CONSTRAINT "lead_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_source_id_lead_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."lead_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_id_lead_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."lead_pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_stage_id_lead_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."lead_pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_follow_up_id_follow_ups_id_fk" FOREIGN KEY ("follow_up_id") REFERENCES "public"."follow_ups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_conditions" ADD CONSTRAINT "automation_conditions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_triggers" ADD CONSTRAINT "automation_triggers_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_accounts" ADD CONSTRAINT "integration_accounts_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_tags_pk" ON "lead_tags" USING btree ("lead_id","tag_id");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_owner_idx" ON "leads" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "leads_pipeline_stage_idx" ON "leads" USING btree ("pipeline_id","stage_id");--> statement-breakpoint
CREATE INDEX "activities_lead_idx" ON "activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "wa_messages_lead_idx" ON "whatsapp_messages" USING btree ("lead_id");