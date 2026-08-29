import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { followUps } from "@/db/schema";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { LeadService } from "@/domains/leads/service";
import { ActivityService } from "@/domains/activities/service";

// Lead detail: lead + activity timeline + this lead's follow-ups.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const lead = await LeadService.getLead(id, auth.organizationId);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = await ActivityService.getLeadActivities(id);
  const fus = await db
    .select({ id: followUps.id, title: followUps.title, type: followUps.type, status: followUps.status, dueAt: followUps.dueAt })
    .from(followUps)
    .where(eq(followUps.leadId, id))
    .orderBy(asc(followUps.dueAt));

  return NextResponse.json({
    data: {
      lead,
      activities: activities.map((a) => ({ id: a.id, type: a.type, content: a.content, createdAt: a.createdAt })),
      followUps: fus,
    },
  });
}

const patchSchema = z
  .object({ status: z.string().min(1).optional(), ownerId: z.string().uuid().nullable().optional() })
  .refine((v) => v.status !== undefined || v.ownerId !== undefined, { message: "Provide status or ownerId" });

// Update a lead: change status and/or (re)assign its owner.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 422 });

  try {
    if (parsed.data.ownerId !== undefined) {
      const { AssignmentService } = await import("@/domains/leads/assignmentService");
      await AssignmentService.assignLead({
        leadId: id,
        ownerId: parsed.data.ownerId,
        teamId: null,
        assignedById: auth.userId ?? "api",
        organizationId: auth.organizationId,
      });
    }
    if (parsed.data.status !== undefined) {
      await LeadService.changeStatus(id, parsed.data.status, auth.userId ?? null, auth.organizationId);
    }
    const lead = await LeadService.getLead(id, auth.organizationId);
    return NextResponse.json({ data: lead });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not update lead" }, { status: 400 });
  }
}
