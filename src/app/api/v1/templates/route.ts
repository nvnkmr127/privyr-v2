import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { authorizeApiRequest } from "@/lib/apiAuth";

// Canned message templates for the org (optionally filtered by channel), for one-tap messaging.
export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;

  const channel = new URL(req.url).searchParams.get("channel");
  const where = channel
    ? and(eq(messageTemplates.organizationId, auth.organizationId), eq(messageTemplates.channel, channel))
    : eq(messageTemplates.organizationId, auth.organizationId);

  const rows = await db
    .select({ id: messageTemplates.id, name: messageTemplates.name, channel: messageTemplates.channel, subject: messageTemplates.subject, body: messageTemplates.body })
    .from(messageTemplates)
    .where(where)
    .orderBy(desc(messageTemplates.createdAt));

  return NextResponse.json({ data: rows });
}
