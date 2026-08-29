import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { assertLeadInOrg } from "@/domains/leads/ownership";
import { ActivityService } from "@/domains/activities/service";

const schema = z.object({ content: z.string().min(1) });

// Add a note to a lead's timeline.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Note cannot be empty" }, { status: 422 });

  await assertLeadInOrg(id, auth.organizationId);
  const activity = await ActivityService.addActivity({
    leadId: id,
    userId: auth.userId,
    type: "note",
    content: parsed.data.content,
  });

  return NextResponse.json({ data: activity }, { status: 201 });
}
