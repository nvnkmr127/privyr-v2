import { db } from "@/db";
import { leads } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// Tenant guard for anything that hangs off a lead (follow-ups, tags, notes). These tables carry
// no organization_id of their own, so ownership is derived from the lead they belong to.

// A subquery of the org's lead ids — use inside inArray() to scope an UPDATE/DELETE by lead ownership.
export function orgLeadIds(organizationId: string) {
  return db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, organizationId));
}

// Throws unless the lead exists AND belongs to the org. Use before inserting a lead-attached row.
export async function assertLeadInOrg(leadId: string, organizationId: string) {
  const [row] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new Error("Lead not found");
}
