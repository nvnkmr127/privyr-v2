import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { LeadService } from "@/domains/leads/service";
import { CustomFieldService } from "@/domains/customFields/service";
import { PlanService } from "@/domains/billing/planService";
import { authorizeApiRequest } from "@/lib/apiAuth";

const authorize = authorizeApiRequest;

export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 50, 200);
  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      company: leads.company,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(eq(leads.organizationId, auth.organizationId), isNull(leads.deletedAt)))
    .orderBy(desc(leads.createdAt))
    .limit(limit);

  return NextResponse.json({ data: rows });
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  company: z.string().max(255).optional().or(z.literal("")),
  customData: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 422 });
  }

  try {
    await PlanService.assertCanAddLead(auth.organizationId);
    const customData = await CustomFieldService.validate(auth.organizationId, parsed.data.customData ?? {});
    const lead = await LeadService.createLead(
      {
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
        company: parsed.data.company || undefined,
        customData,
      },
      auth.userId ?? null,
      auth.organizationId
    );
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Could not create lead";
    if (msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("plan")) {
      return NextResponse.json({ error: msg }, { status: 402 });
    }
    if (msg.toLowerCase().includes("required") || msg.toLowerCase().includes("invalid")) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
