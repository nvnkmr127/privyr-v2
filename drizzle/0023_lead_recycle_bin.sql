ALTER TABLE "leads" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;