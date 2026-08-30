import { db } from "@/db";
import { webhookEndpoints } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { LeadWebhookEventService, WebhookEventPayload } from "@/domains/leads/leadWebhookEventService";
// No static `crypto` import — reachable from instrumentation's edge-compiled graph. Lazy-load it.

// The lead events an outbound webhook can subscribe to.
export const WEBHOOK_EVENT_TYPES = [
  "lead.created",
  "lead.status_changed",
  "lead.hot_threshold",
  "lead.stagnant_alert",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export class WebhookEndpointService {
  static list(organizationId: string) {
    return db.select().from(webhookEndpoints).where(eq(webhookEndpoints.organizationId, organizationId));
  }

  static async create(organizationId: string, url: string, events: string[]) {
    const { randomBytes } = await import("crypto");
    const secret = randomBytes(24).toString("hex");
    const [row] = await db
      .insert(webhookEndpoints)
      .values({ organizationId, url, secret, events })
      .returning();
    return row;
  }

  static async setActive(organizationId: string, id: string, isActive: boolean) {
    const [row] = await db
      .update(webhookEndpoints)
      .set({ isActive: isActive ? 1 : 0 })
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)))
      .returning();
    return row;
  }

  static async remove(organizationId: string, id: string) {
    await db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organizationId)));
  }

  // Producer: enqueue a signed delivery to every active endpoint in this org that subscribed to
  // `event`. Best-effort — never throws into the caller (an event handler); logs and moves on.
  static async dispatch(organizationId: string, event: WebhookEventType, data: Record<string, any>): Promise<void> {
    try {
      const rows = await db
        .select()
        .from(webhookEndpoints)
        .where(and(eq(webhookEndpoints.organizationId, organizationId), eq(webhookEndpoints.isActive, 1)));
      const targets = rows.filter((r) => (r.events ?? []).includes(event));
      if (targets.length === 0) return;

      const payload: WebhookEventPayload = LeadWebhookEventService.constructPayload(organizationId, event, data);
      const { webhookDeliveryQueue } = await import("@/lib/jobs/workers/webhookRetryWorker");
      await Promise.all(
        targets.map((t) =>
          webhookDeliveryQueue.add(`wh-${t.id}-${payload.eventId}`, {
            endpointId: t.id,
            endpointUrl: t.url,
            webhookSecret: t.secret,
            payload,
          }),
        ),
      );
    } catch (e) {
      console.error("[webhook-dispatch] failed to enqueue deliveries", e);
    }
  }
}
