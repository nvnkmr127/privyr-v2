"use server";

import { requireOrg } from "@/lib/rbac";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { and, eq, or, ilike, desc } from "drizzle-orm";

// Org-scoped lead search for the command palette. Matches name/email/phone/company.
export async function searchLeadsAction(query: string) {
  const { organizationId } = await requireOrg();
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  return db
    .select({ id: leads.id, name: leads.name, email: leads.email, phone: leads.phone, company: leads.company })
    .from(leads)
    .where(and(
      eq(leads.organizationId, organizationId),
      or(ilike(leads.name, like), ilike(leads.email, like), ilike(leads.phone, like), ilike(leads.company, like)),
    ))
    .orderBy(desc(leads.createdAt))
    .limit(10);
}
