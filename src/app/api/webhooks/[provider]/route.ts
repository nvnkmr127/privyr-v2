import { NextRequest, NextResponse } from "next/server";
import { RateLimiter } from "@/lib/rate-limit";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { ingestionQueue } from "@/lib/jobs/workers/ingestionWorker";

import { z } from "zod";

const webhookPayloadSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).passthrough();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const rawText = await req.text();
    let rawBody;
    try {
      rawBody = JSON.parse(rawText);
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid JSON format" }, { status: 400 });
    }
    
    // Basic validation to ensure the payload is well-formed
    const parseResult = webhookPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: "Invalid payload format" }, { status: 400 });
    }
    const body = parseResult.data;
    
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = `webhook:${provider}:${ip}`;
    const limitResult = await RateLimiter.checkLimit(rateLimitKey, 100, 60);

    if (!limitResult.success) {
      return NextResponse.json({ success: false, error: "Too Many Requests" }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.reset.toString(),
        }
      });
    }

    // Identify source
    const sourceId = (body as any).sourceId || req.nextUrl.searchParams.get("sourceId");
    if (!sourceId) {
      return NextResponse.json({ success: false, error: "Missing sourceId" }, { status: 400 });
    }

    const { LeadSourceService } = await import("@/domains/leads/sourceService");
    const source = await LeadSourceService.getSource(sourceId);
    if (!source || !source.isActive) {
      return NextResponse.json({ success: false, error: "Invalid or inactive source" }, { status: 403 });
    }

    // Signature validation (HMAC SHA-256)
    const signature = req.headers.get("x-hub-signature-256");
    if (source.webhookSecret && signature) {
      const crypto = await import("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", source.webhookSecret)
        .update(rawText)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
      }
    }

    // Simple idempotency check based on a header (optional, depends on provider)
    const idempotencyKey = req.headers.get("x-idempotency-key") || undefined;

    if (idempotencyKey) {
      const { eq, and } = await import("drizzle-orm");
      const [existingEvent] = await db
        .select()
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.provider, provider),
            eq(webhookEvents.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);

      if (existingEvent) {
        return NextResponse.json({ success: true, eventId: existingEvent.id, duplicate: true }, { status: 200 });
      }
    }

    // 1. Store the webhook event immediately
    const [event] = await db.insert(webhookEvents).values({
      provider,
      payload: body,
      idempotencyKey,
    }).returning();

    // 2. Offload to BullMQ for asynchronous processing
    await ingestionQueue.add(`ingest-${event.id}`, {
      webhookEventId: event.id
    });

    return NextResponse.json({ success: true, eventId: event.id }, { status: 202 });

  } catch (error: any) {
    console.error("Webhook receiver error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
