"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { ingestionQueue } from "@/lib/jobs/workers/ingestionWorker";
import { LeadSourceService } from "@/domains/leads/sourceService";
import { RateLimiter } from "@/lib/rate-limit";
import { ok, fail, actionFail } from "@/lib/actions/result";
import { resolveFormFields, buildSubmission } from "@/lib/leads/formFields";

// Public (no auth) lead capture from a hosted web form. The sourceId in the URL is the only
// "credential"; it only lets a visitor create a lead. Fields are whatever the tenant configured
// for this source — validated server-side against that saved schema, never the client's claim.
// Rate-limited per source+IP.
export async function submitPublicLeadAction(sourceId: string, input: Record<string, string>) {
  const source = await LeadSourceService.getSource(sourceId);
  if (!source || !source.isActive || !source.organizationId) {
    return fail("NOT_FOUND", "This form is no longer active.");
  }

  const fields = resolveFormFields(source.config);
  const built = buildSubmission(fields, input ?? {});
  if (!built.ok) return fail("VALIDATION", built.error);

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
        // Standard keys map to lead columns; custom keys land in custom_data via the adapter.
        payload: {
          ...built.values,
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
