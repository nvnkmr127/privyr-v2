CREATE TABLE "custom_status_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"color" varchar(50) DEFAULT '#6B7280' NOT NULL,
	"category" varchar(50) DEFAULT 'open' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_system_default" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "timezone" varchar(64) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "locale" varchar(10) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "date_format" varchar(20) DEFAULT 'MM/DD/YYYY' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "industry" varchar(120);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "phone" varchar(30);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "website" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "address_line1" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "city" varchar(120);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "state" varchar(120);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "custom_status_configs" ADD CONSTRAINT "custom_status_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;