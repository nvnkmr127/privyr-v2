import { Queue, Worker, Job } from "bullmq";
import { createRedis, quietErrors } from "../redis";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { IngestionService } from "@/lib/leads/ingestion";

const connection = createRedis({ maxRetriesPerRequest: null });

export const INGESTION_QUEUE_NAME = "lead-ingestion";
export const ingestionQueue = new Queue(INGESTION_QUEUE_NAME, { connection });

export interface IngestionJobData {
  webhookEventId: string;
}

export const ingestionWorker = new Worker<IngestionJobData>(
  INGESTION_QUEUE_NAME,
  async (job: Job<IngestionJobData>) => {
    const { webhookEventId } = job.data;

    const [event] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, webhookEventId)).limit(1);
    
    if (!event) throw new Error("Webhook event not found");
    if (event.status === 'processed') return { status: 'skipped', reason: 'already_processed' };

    try {
      // Mark as processing and increment retry count
      await db.update(webhookEvents)
        .set({ status: 'processing', retryCount: event.retryCount + 1 })
        .where(eq(webhookEvents.id, event.id));

      const rawPayload = (event.payload || {}) as any;
      let normalized: any;

      if (event.provider === "facebook" || (event.provider === "facebook_lead_ads" && !rawPayload.sourceId)) {
        const pageId = rawPayload.page_id || rawPayload.raw?.page_id;
        const leadgenId = rawPayload.leadgen_id;

        // Look up active Facebook Lead Ads source matching this Page
        const { leadSources } = await import("@/db/schema");
        const allFbSources = await db
          .select()
          .from(leadSources)
          .where(eq(leadSources.type, "facebook_lead_ads"));

        const matchedSource =
          allFbSources.find((s) => (s.config as any)?.pageId === pageId && s.isActive === 1) ||
          allFbSources.find((s) => (s.config as any)?.pageId === pageId);

        if (!matchedSource || !matchedSource.organizationId) {
          throw new Error(`No Facebook Lead Ads source configured for Page ID: ${pageId || "unknown"}`);
        }

        const sourceId = matchedSource.id;
        const organizationId = matchedSource.organizationId;
        const pageAccessToken = (matchedSource.config as any)?.pageAccessToken;

        let fbLeadData = rawPayload;
        // If the payload only has the leadgen_id (standard Meta webhook), fetch actual lead answers from Graph API
        if ((!rawPayload.field_data || rawPayload.field_data.length === 0) && leadgenId && pageAccessToken) {
          const { MetaTokenRefreshService } = await import("@/domains/leads/metaTokenRefreshService");
          fbLeadData = await MetaTokenRefreshService.fetchLeadgenData(leadgenId, pageAccessToken);
        }

        // Campaign filter check: If user configured specific campaigns to pull from, skip non-matching campaigns
        const sourceConfig = (matchedSource.config as any) || {};
        const rawCampaignFilter = sourceConfig.campaignFilter;
        const campaignFilter: string[] = Array.isArray(rawCampaignFilter)
          ? rawCampaignFilter.map((s) => String(s).trim().toLowerCase())
          : typeof rawCampaignFilter === "string" && rawCampaignFilter.trim()
          ? rawCampaignFilter.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
          : [];

        if (campaignFilter.length > 0) {
          const leadCampaignId = String(fbLeadData.campaign_id || "").toLowerCase();
          const leadCampaignName = String(fbLeadData.campaign_name || "").toLowerCase();
          const matches = campaignFilter.some(
            (f) =>
              (leadCampaignId && leadCampaignId === f) ||
              (leadCampaignName && leadCampaignName.includes(f)) ||
              (f.includes(leadCampaignName) && leadCampaignName.length > 0)
          );

          if (!matches) {
            console.log(
              `[FACEBOOK_INGESTION_SKIPPED] Lead from campaign "${fbLeadData.campaign_name || leadCampaignId}" skipped by campaign filter.`
            );
            await db
              .update(webhookEvents)
              .set({ status: "processed", processedAt: new Date(), errorLog: { reason: "filtered_by_campaign_filter" } })
              .where(eq(webhookEvents.id, event.id));
            return { status: "skipped", reason: "filtered_campaign" };
          }
        }

        const { FacebookLeadMappingService } = await import("@/domains/leads/facebookLeadMappingService");
        const mapped = FacebookLeadMappingService.mapFacebookLeadToStandardLead(fbLeadData);

        normalized = {
          name: mapped.name,
          email: mapped.email || undefined,
          phone: mapped.phone || undefined,
          sourceId,
          organizationId,
          externalId: mapped.facebookLeadgenId || leadgenId,
          customData: {
            ...mapped.customData,
            expectedValue: mapped.expectedValue,
            leadSource: mapped.source,
          },
        };
      } else {
        let adapter: any;
        if (event.provider === "webform") {
          const { WebFormAdapter } = await import("@/lib/integrations/adapters/WebFormAdapter");
          adapter = new WebFormAdapter();
        } else if (event.provider === "facebook_lead_ads") {
          const { FacebookLeadAdsAdapter } = await import("@/lib/integrations/adapters/FacebookLeadAdsAdapter");
          adapter = new FacebookLeadAdsAdapter();
        } else if (event.provider === "generic_webhook") {
          const { GenericWebhookAdapter } = await import("@/lib/integrations/adapters/GenericWebhookAdapter");
          adapter = new GenericWebhookAdapter();
        } else {
          throw new Error(`Unsupported provider: ${event.provider}`);
        }

        const sourceId = rawPayload.sourceId;
        if (!sourceId) {
          throw new Error("Missing sourceId in payload");
        }

        normalized = await adapter.normalize(rawPayload, sourceId, rawPayload.teamId, rawPayload.ownerId);
        if (rawPayload.organizationId) {
          normalized.organizationId = rawPayload.organizationId;
        }
      }

      const result = await IngestionService.processLead(normalized);

      await db.update(webhookEvents)
        .set({ status: 'processed', processedAt: new Date() })
        .where(eq(webhookEvents.id, event.id));

      return result;

    } catch (error: any) {
      await db.update(webhookEvents)
        .set({ 
          status: 'failed', 
          errorLog: { message: error.message, stack: error.stack } 
        })
        .where(eq(webhookEvents.id, event.id));
        
      throw error;
    }
  },
  { connection, concurrency: 5 }
);
quietErrors(ingestionWorker);
