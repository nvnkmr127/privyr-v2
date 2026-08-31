ALTER TABLE "tenant_integration_settings" ADD COLUMN "capi_enabled" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_integration_settings" ADD COLUMN "capi_pixel_id" varchar(64);--> statement-breakpoint
ALTER TABLE "tenant_integration_settings" ADD COLUMN "capi_access_token_enc" text;--> statement-breakpoint
ALTER TABLE "tenant_integration_settings" ADD COLUMN "capi_test_event_code" varchar(64);