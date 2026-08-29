import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { followUps, leads } from "@/db/schema";
import { authorizeApiRequest } from "@/lib/apiAuth";

// The signed-in user's follow-ups (pending first, by due date), each with its lead.
export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  if (!auth.userId) return NextResponse.json({ data: [] }); // API-key requests have no user scope

  const rows = await db
    .select({
      id: followUps.id,
      title: followUps.title,
      type: followUps.type,
      status: followUps.status,
      dueAt: followUps.dueAt,
      leadId: leads.id,
      leadName: leads.name,
    })
    .from(followUps)
    .innerJoin(leads, eq(followUps.leadId, leads.id))
    .where(and(eq(followUps.userId, auth.userId), eq(leads.organizationId, auth.organizationId)))
    .orderBy(asc(followUps.dueAt));

  return NextResponse.json({ data: rows });
}
