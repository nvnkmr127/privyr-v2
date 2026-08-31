CREATE TABLE IF NOT EXISTS "email_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_name" varchar(255),
	"from_email" varchar(255),
	"smtp_host" varchar(255),
	"smtp_port" integer,
	"smtp_secure" integer DEFAULT 1 NOT NULL,
	"smtp_user" varchar(255),
	"smtp_password_enc" text,
	"enabled" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
