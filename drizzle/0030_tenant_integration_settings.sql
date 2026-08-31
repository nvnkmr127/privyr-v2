CREATE TABLE IF NOT EXISTS "tenant_integration_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"enrichment_enabled" integer DEFAULT 0 NOT NULL,
	"enrichment_api_url" varchar(500),
	"enrichment_auth_header" varchar(100),
	"enrichment_auth_value_enc" text,
	"enrichment_timeout_ms" integer,
	"inbound_email_enabled" integer DEFAULT 0 NOT NULL,
	"inbound_email_token" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_integration_settings_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "tenant_integration_settings_inbound_email_token_unique" UNIQUE("inbound_email_token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_integration_settings" ADD CONSTRAINT "tenant_integration_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
