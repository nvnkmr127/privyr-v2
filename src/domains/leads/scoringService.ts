import { db } from "@/db";
import { leads, activities, whatsappMessages } from "@/db/schema";
import { and, eq, count } from "drizzle-orm";

export interface LeadScoreInput {
  status: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  lastContactedAt?: Date | null;
  nextFollowUpAt?: Date | null;
  activitiesCount?: number;
  hasInboundMsg?: boolean;
}

export class ScoringService {
  /**
   * Pure scoring logic: calculate engagement score (0-100) based on lead data and activity signals.
   */
  static calculateScore(input: LeadScoreInput): number {
    let score = 0;

    // Status weighting (max 40)
    switch (input.status) {
      case "won":
        score += 50;
        break;
      case "active":
        score += 35;
        break;
      case "new":
        score += 20;
        break;
      default:
        score += 0;
    }

    // Profile completeness (max 30)
    if (input.phone) score += 10;
    if (input.email) score += 10;
    if (input.company) score += 10;

    // Recency of contact (max 10)
    if (input.lastContactedAt) {
      const daysSinceContact = (Date.now() - new Date(input.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceContact <= 7) {
        score += 10;
      } else if (daysSinceContact <= 14) {
        score += 5;
      }
    }

    // Scheduled follow-up adherence (max 10)
    if (input.nextFollowUpAt && new Date(input.nextFollowUpAt) >= new Date()) {
      score += 10;
    }

    // Engagement signals (max 10)
    if (input.activitiesCount && input.activitiesCount > 0) {
      score += Math.min(10, input.activitiesCount * 2);
    }
    if (input.hasInboundMsg) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Re-evaluates and updates score for a specific lead in the database.
   */
  static async updateLeadScore(leadId: string): Promise<number> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const [{ count: actCount }] = await db
      .select({ count: count() })
      .from(activities)
      .where(eq(activities.leadId, leadId));

    const [inbound] = await db
      .select({ id: whatsappMessages.id })
      .from(whatsappMessages)
      .where(and(eq(whatsappMessages.leadId, leadId), eq(whatsappMessages.direction, "inbound")))
      .limit(1);

    const score = this.calculateScore({
      status: lead.status,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      lastContactedAt: lead.lastContactedAt,
      nextFollowUpAt: lead.nextFollowUpAt,
      activitiesCount: Number(actCount ?? 0),
      hasInboundMsg: !!inbound,
    });

    await db.update(leads).set({ score, updatedAt: new Date() }).where(eq(leads.id, leadId));
    return score;
  }

  /**
   * Recalculates scores for all leads (or scoped to an organization) to process recency decay.
   */
  static async recalculateAllScores(organizationId?: string): Promise<number> {
    const query = organizationId
      ? db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, organizationId))
      : db.select({ id: leads.id }).from(leads);

    const allLeads = await query;
    let updated = 0;
    for (const lead of allLeads) {
      await this.updateLeadScore(lead.id);
      updated++;
    }
    return updated;
  }
}
