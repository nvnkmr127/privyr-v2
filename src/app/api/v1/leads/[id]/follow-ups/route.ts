import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { FollowUpService } from "@/domains/follow-ups/service";

const schema = z.object({
  title: z.string().min(1),
  dueAt: z.string().datetime(),
  type: z.enum(["follow_up", "task"]).optional(),
  description: z.string().optional(),
});

// Schedule a follow-up / task on a lead.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  if (!auth.userId) return NextResponse.json({ error: "A user session is required" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.issues }, { status: 422 });

  try {
    const followUp = await FollowUpService.createFollowUp({
      leadId: id,
      type: parsed.data.type ?? "follow_up",
      title: parsed.data.title,
      description: parsed.data.description,
      dueAt: new Date(parsed.data.dueAt),
      userId: auth.userId,
      organizationId: auth.organizationId,
    });
    return NextResponse.json({ data: followUp }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not schedule follow-up" }, { status: 400 });
  }
}
