import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ApiKeyService } from "@/domains/apiKeys/service";
import { LeadService } from "@/domains/leads/service";
import { CustomFieldService } from "@/domains/customFields/service";
import { PlanService } from "@/domains/billing/planService";

// Resolve the Bearer key to an org, or return a 401 response.
async function authorize(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const raw = header.startsWith("Bearer ") ? header.slice(7) : "";
  const auth = await ApiKeyService.verify(raw);
  if (!auth) return { error: NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 }) };
  return { organizationId: auth.organizationId };
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 50, 200);
  const rows = await db
    .select({ id: leads.id, name: leads.name, email: leads.email, phone: leads.phone, company: leads.company, status: leads.status, createdAt: leads.createdAt })
    .from(leads)
    .where(eq(leads.organizationId, auth.organizationId))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
  return NextResponse.json({ data: rows });
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.issues }, { status: 422 });
  }

  try {
    await PlanService.assertCanAddLead(auth.organizationId);
    const customData = await CustomFieldService.validate(auth.organizationId, parsed.data.customData ?? {});
    const lead = await LeadService.createLead({ ...parsed.data, customData }, null, auth.organizationId);
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not create lead" }, { status: 409 });
  }
}
