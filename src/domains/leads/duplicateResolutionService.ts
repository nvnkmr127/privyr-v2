import { db } from "@/db";
import { leads, activities, followUps, whatsappMessages, leadTags } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ActivityService } from "@/domains/activities/service";

export interface DuplicateGroup {
  matchKey: string;
  type: "phone" | "email";
  leadIds: string[];
}

export class DuplicateResolutionService {
  /**
   * Scans organization leads for duplicate candidates by phone number or email address.
   */
  static async detectDuplicates(organizationId: string): Promise<DuplicateGroup[]> {
    const orgLeads = await db
      .select({
        id: leads.id,
        phone: leads.phone,
        email: leads.email,
      })
      .from(leads)
      .where(eq(leads.organizationId, organizationId));

    const phoneGroups: Record<string, string[]> = {};
    const emailGroups: Record<string, string[]> = {};

    for (const l of orgLeads) {
      if (l.phone) {
        const digits = l.phone.replace(/\D/g, "");
        if (digits.length >= 7) {
          phoneGroups[digits] = phoneGroups[digits] || [];
          phoneGroups[digits].push(l.id);
        }
      }
      if (l.email) {
        const normalizedEmail = l.email.trim().toLowerCase();
        if (normalizedEmail) {
          emailGroups[normalizedEmail] = emailGroups[normalizedEmail] || [];
          emailGroups[normalizedEmail].push(l.id);
        }
      }
    }

    const results: DuplicateGroup[] = [];

    for (const [digits, ids] of Object.entries(phoneGroups)) {
      if (ids.length > 1) {
        results.push({ matchKey: digits, type: "phone", leadIds: ids });
      }
    }

    for (const [email, ids] of Object.entries(emailGroups)) {
      if (ids.length > 1) {
        results.push({ matchKey: email, type: "email", leadIds: ids });
      }
    }

    return results;
  }

  /**
   * Merges secondary lead into primary lead: reassigns activities, follow-ups, messages & tags, then removes secondary lead.
   */
  static async mergeLeads(
    primaryId: string,
    secondaryId: string,
    organizationId: string,
    userId?: string
  ): Promise<{ success: boolean; primaryLeadId: string }> {
    if (primaryId === secondaryId) throw new Error("Cannot merge a lead into itself");

    const [primary] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, primaryId), eq(leads.organizationId, organizationId)))
      .limit(1);

    const [secondary] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, secondaryId), eq(leads.organizationId, organizationId)))
      .limit(1);

    if (!primary || !secondary) {
      throw new Error("One or both leads for merge do not exist in this organization");
    }

    // 1. Reassign activities
    await db.update(activities).set({ leadId: primaryId }).where(eq(activities.leadId, secondaryId));

    // 2. Reassign follow-ups
    await db.update(followUps).set({ leadId: primaryId }).where(eq(followUps.leadId, secondaryId));

    // 3. Reassign WhatsApp messages
    await db
      .update(whatsappMessages)
      .set({ leadId: primaryId })
      .where(eq(whatsappMessages.leadId, secondaryId));

    // 4. Reassign tag links (onConflictDoNothing handles duplicates)
    const secTags = await db.select().from(leadTags).where(eq(leadTags.leadId, secondaryId));
    for (const tagLink of secTags) {
      await db.insert(leadTags).values({ leadId: primaryId, tagId: tagLink.tagId }).onConflictDoNothing();
    }
    await db.delete(leadTags).where(eq(leadTags.leadId, secondaryId));

    // 5. Delete secondary lead entity
    await db.delete(leads).where(eq(leads.id, secondaryId));

    // 6. Log merge audit activity on primary lead
    await ActivityService.addActivity({
      leadId: primaryId,
      userId,
      type: "note",
      content: `Merged duplicate lead "${secondary.name}" (${secondary.id}) into this primary record.`,
    });

    return { success: true, primaryLeadId: primaryId };
  }
}
