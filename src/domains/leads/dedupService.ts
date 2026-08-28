import { db } from "@/db";
import {
  leads,
  activities,
  followUps,
  leadStatusHistory,
  leadTags,
  whatsappMessages,
  notifications,
} from "@/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

// Child tables that carry a lead_id and should follow the surviving lead on merge.
const REASSIGN = [activities, followUps, leadStatusHistory, whatsappMessages, notifications] as const;

export class DedupService {
  // Groups of leads in the org that share a normalized email or phone. Cheap heuristic, good enough
  // for a review screen. ponytail: exact-match only; fuzzy/name matching if it proves necessary.
  static async findDuplicateGroups(organizationId: string) {
    const rows = await db
      .select({ id: leads.id, name: leads.name, email: leads.email, phone: leads.phone, createdAt: leads.createdAt })
      .from(leads)
      .where(eq(leads.organizationId, organizationId));

    const byKey = new Map<string, typeof rows>();
    for (const r of rows) {
      for (const key of [r.email && `e:${r.email.toLowerCase()}`, r.phone && `p:${r.phone.replace(/\D/g, "")}`]) {
        if (!key) continue;
        const g = byKey.get(key) ?? [];
        g.push(r);
        byKey.set(key, g);
      }
    }
    // Dedupe leads that matched on both email and phone into one group per set of ids.
    const seen = new Set<string>();
    const groups: { key: string; leads: typeof rows }[] = [];
    for (const [key, g] of byKey) {
      if (g.length < 2) continue;
      const sig = g.map((l) => l.id).sort().join(",");
      if (seen.has(sig)) continue;
      seen.add(sig);
      groups.push({ key, leads: g });
    }
    return groups;
  }

  // Merge `duplicateId` into `primaryId`: move child rows, then delete the duplicate. Org-scoped.
  static async merge(organizationId: string, primaryId: string, duplicateId: string) {
    if (primaryId === duplicateId) throw new Error("Cannot merge a lead into itself");
    const owned = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.organizationId, organizationId), sql`${leads.id} in (${primaryId}, ${duplicateId})`));
    if (owned.length !== 2) throw new Error("Both leads must belong to your organization");

    await db.transaction(async (tx) => {
      for (const table of REASSIGN) {
        await tx.update(table).set({ leadId: primaryId }).where(eq(table.leadId, duplicateId));
      }
      // Tags: (lead_id, tag_id) is a pseudo-PK, so drop the duplicate's links already on the primary first.
      const primaryTags = await tx.select({ tagId: leadTags.tagId }).from(leadTags).where(eq(leadTags.leadId, primaryId));
      const have = new Set(primaryTags.map((t) => t.tagId));
      const dupTags = await tx.select({ tagId: leadTags.tagId }).from(leadTags).where(eq(leadTags.leadId, duplicateId));
      for (const t of dupTags) {
        if (have.has(t.tagId)) {
          await tx.delete(leadTags).where(and(eq(leadTags.leadId, duplicateId), eq(leadTags.tagId, t.tagId)));
        }
      }
      await tx.update(leadTags).set({ leadId: primaryId }).where(eq(leadTags.leadId, duplicateId));

      await tx.delete(leads).where(and(eq(leads.id, duplicateId), eq(leads.organizationId, organizationId), ne(leads.id, primaryId)));
    });
  }
}
