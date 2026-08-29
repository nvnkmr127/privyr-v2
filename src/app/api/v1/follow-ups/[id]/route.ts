import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { FollowUpService } from "@/domains/follow-ups/service";

const schema = z.object({
  action: z.enum(["complete", "cancel", "reschedule"]),
  dueAt: z.string().datetime().optional(),
});

// Complete / cancel / reschedule a follow-up.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 422 });

  try {
    let result;
    if (parsed.data.action === "complete") {
      result = await FollowUpService.completeFollowUp(id, auth.organizationId);
    } else if (parsed.data.action === "cancel") {
      result = await FollowUpService.cancelFollowUp(id, auth.organizationId);
    } else {
      if (!parsed.data.dueAt) return NextResponse.json({ error: "dueAt required to reschedule" }, { status: 422 });
      result = await FollowUpService.rescheduleFollowUp(id, new Date(parsed.data.dueAt), auth.organizationId);
    }
    return NextResponse.json({ data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not update follow-up" }, { status: 400 });
  }
}
