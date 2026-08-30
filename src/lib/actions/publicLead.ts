"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { ingestionQueue } from "@/lib/jobs/workers/ingestionWorker";
import { LeadSourceService } from "@/domains/leads/sourceService";
import { RateLimiter } from "@/lib/rate-limit";
import { ok, fail, actionFail, zodFieldErrors } from "@/lib/actions/result";

// Public (no auth) lead capture from a hosted web form. The sourceId in the URL is the only
// "credential"; it only lets a visitor create a lead. Rate-limited per source+IP.
const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional(),
});

export async function submitPublicLeadAction(sourceId: string, input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  if (!data.email && !data.phone) {
    return fail("VALIDATION", "Please provide an email or phone number so we can reach you.");
  }

  const source = await LeadSourceService.getSource(sourceId);
  if (!source || !source.isActive || !source.organizationId) {
    return fail("NOT_FOUND", "This form is no longer active.");
  }

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const limit = await RateLimiter.checkLimit(`public-form:${sourceId}:${ip}`, 10, 60);
  if (!limit.success) {
    return fail("RATE_LIMIT", "Too many submissions. Please wait a moment and try again.");
  }

  try {
    const [event] = await db
      .insert(webhookEvents)
      .values({
        provider: "generic_webhook",
        payload: {
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          message: data.message || undefined,
          sourceId,
          organizationId: source.organizationId,
          source: source.name,
        },
      })
      .returning({ id: webhookEvents.id });

    await ingestionQueue.add(`ingest-${event.id}`, { webhookEventId: event.id });
    return ok({ submitted: true });
  } catch (e) {
    return actionFail(e);
  }
}
