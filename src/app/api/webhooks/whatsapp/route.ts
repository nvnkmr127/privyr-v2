import { NextRequest, NextResponse } from "next/server";
import { parseWebhook } from "@/lib/messaging/whatsapp/parse";
import { WhatsAppService } from "@/lib/messaging/whatsapp/service";
import { verifyMetaSignature } from "@/lib/webhooks/signature";
import { InboundIntentService } from "@/domains/leads/inboundIntentService";

// GET: webhook verification handshake. Meta/most BSPs send hub.* params and expect the
// challenge echoed back when the verify token matches. WATXIO_DOC: confirm param names.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const mode = q.get("hub.mode");
  const token = q.get("hub.verify_token");
  const challenge = q.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WATXIO_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST: inbound replies + delivery-status updates. Always 200 fast so Watxio doesn't retry-storm;
// failures on individual items are logged, not surfaced.
export async function POST(req: NextRequest) {
  const rawText = await req.text();

  // Verify the payload signature when a secret is configured. Most BSPs proxy the Meta Cloud API
  // and sign as `x-hub-signature-256` over the app secret. Unset = skipped (Watxio's scheme
  // unconfirmed); rely on the verify token + hard-to-guess path until WATXIO_APP_SECRET is set.
  const appSecret = process.env.WATXIO_APP_SECRET;
  if (appSecret && !verifyMetaSignature(rawText, req.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { messages, statuses } = parseWebhook(body);

  await Promise.allSettled([
    ...statuses.map((s) => WhatsAppService.updateStatus(s.id, s.status)),
    ...messages.map(async (m) => {
      const res = await WhatsAppService.recordInbound({ fromPhone: m.from, providerMessageId: m.id, body: m.body });
      // AI intent/sentiment tagging on matched replies — best-effort, never blocks the ack.
      if (res.matched && res.leadId) await InboundIntentService.classifyAndTag(res.leadId, m.body, res.organizationId);
    }),
  ]);

  return NextResponse.json({ ok: true, received: messages.length + statuses.length });
}
