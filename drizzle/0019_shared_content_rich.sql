ALTER TABLE "shared_links" ALTER COLUMN "target_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_links" ADD COLUMN "body_text" text;--> statement-breakpoint
ALTER TABLE "shared_links" ADD COLUMN "image_url" varchar(2048);