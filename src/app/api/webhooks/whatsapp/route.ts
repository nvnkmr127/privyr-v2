import { NextRequest, NextResponse } from "next/server";
import { parseWebhook } from "@/lib/messaging/whatsapp/parse";
import { WhatsAppService } from "@/lib/messaging/whatsapp/service";

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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // ponytail: signature verification (x-hub-signature-256 over the app secret) not wired —
  // add once Watxio's signing scheme is known. Until then rely on the verify token + a
  // hard-to-guess webhook path.

  const { messages, statuses } = parseWebhook(body);

  await Promise.allSettled([
    ...statuses.map((s) => WhatsAppService.updateStatus(s.id, s.status)),
    ...messages.map((m) =>
      WhatsAppService.recordInbound({ fromPhone: m.from, providerMessageId: m.id, body: m.body }),
    ),
  ]);

  return NextResponse.json({ ok: true, received: messages.length + statuses.length });
}
