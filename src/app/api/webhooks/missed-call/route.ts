import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { WhatsAppService } from "@/lib/messaging/whatsapp/service";
import { ActivityService } from "@/domains/activities/service";

// Provider-agnostic missed-call → instant WhatsApp. Point any telephony provider (Twilio,
// Exotel, Knowlarity, …) at POST /api/webhooks/missed-call with { phone } when a call to your
// business number is missed. We match the caller to a lead and auto-send a WhatsApp so no
// missed call goes un-followed-up. Optional shared secret: header x-webhook-secret.
export async function POST(req: NextRequest) {
  const secret = process.env.MISSED_CALL_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const phone: string = body.phone || body.from || body.caller || "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return NextResponse.json({ ok: false, error: "missing phone" }, { status: 400 });

  const [lead] = await db
    .select({ id: leads.id, name: leads.name })
    .from(leads)
    .where(sql`regexp_replace(${leads.phone}, '\\D', '', 'g') = ${digits}`)
    .limit(1);

  if (!lead) return NextResponse.json({ ok: true, matched: false });

  const message =
    process.env.MISSED_CALL_MESSAGE ||
    "Hi {{first_name}}, sorry we missed your call! How can we help? Reply here and we'll get right back to you.";

  try {
    await WhatsAppService.send({ leadId: lead.id, body: message });
    await ActivityService.addActivity({ leadId: lead.id, type: "whatsapp", content: "Missed call → auto WhatsApp sent." });
  } catch {
    // Personal mode / outside window: log the missed call so the rep follows up manually.
    await ActivityService.addActivity({ leadId: lead.id, type: "note", content: "Missed call — auto WhatsApp couldn't send; follow up manually." });
  }

  return NextResponse.json({ ok: true, matched: true, leadId: lead.id });
}
