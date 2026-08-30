import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { LeadService } from "@/domains/leads/service";

const idSchema = z.string().uuid();

// Restore a soft-deleted lead from the recycle bin.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });

  try {
    const restored = await LeadService.restoreLead(id, auth.organizationId);
    if (!restored) return NextResponse.json({ error: "This lead is no longer in the recycle bin." }, { status: 404 });
    return NextResponse.json({ data: { restored: true } });
  } catch (e) {
    const { logError } = await import("@/lib/log");
    const ref = logError("api/v1/leads/[id]/restore", e, { leadId: id });
    return NextResponse.json({ error: "Could not restore lead. Please try again.", ref }, { status: 500 });
  }
}
