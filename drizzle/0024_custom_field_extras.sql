ALTER TABLE "custom_field_defs" ADD COLUMN "default_value" text;--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN "disabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN "admin_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD COLUMN "show_on_table" boolean DEFAULT false NOT NULL;