CREATE INDEX "leads_org_phone_idx" ON "leads" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE INDEX "leads_org_email_idx" ON "leads" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "leads_org_owner_idx" ON "leads" USING btree ("organization_id","owner_id");--> statement-breakpoint
CREATE INDEX "leads_org_status_idx" ON "leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "leads_org_source_idx" ON "leads" USING btree ("organization_id","source_id");--> statement-breakpoint
CREATE INDEX "activities_lead_created_idx" ON "activities" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "follow_ups_user_due_idx" ON "follow_ups" USING btree ("user_id","status","due_at");--> statement-breakpoint
CREATE INDEX "follow_ups_lead_idx" ON "follow_ups" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "reminders_follow_up_idx" ON "reminders" USING btree ("follow_up_id");--> statement-breakpoint
CREATE INDEX "auto_runs_idempotency_idx" ON "automation_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "auto_runs_lead_idx" ON "automation_runs" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "auto_triggers_type_idx" ON "automation_triggers" USING btree ("type","automation_id");--> statement-breakpoint
CREATE INDEX "wa_messages_provider_msg_idx" ON "whatsapp_messages" USING btree ("provider_message_id");