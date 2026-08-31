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

/** One observed contribution to a lead's score — the "why" behind the number. */
export interface ScoreFactor {
  label: string;
  points: number;
}

export interface ScoreBreakdown {
  score: number;
  factors: ScoreFactor[];
}

export class ScoringService {
  /**
   * Explainable scoring: returns the 0-100 score AND the factors that produced it, so the number
   * is never an opaque guess — a rep can see exactly why. `calculateScore` derives from this.
   */
  static breakdown(input: LeadScoreInput): ScoreBreakdown {
    const factors: ScoreFactor[] = [];

    // Status weighting
    const statusPoints: Record<string, number> = { won: 50, active: 35, new: 20 };
    const statusPts = statusPoints[input.status] ?? 0;
    if (statusPts) factors.push({ label: `Status: ${input.status}`, points: statusPts });

    // Profile completeness
    if (input.phone) factors.push({ label: "Has phone", points: 10 });
    if (input.email) factors.push({ label: "Has email", points: 10 });
    if (input.company) factors.push({ label: "Has company", points: 10 });

    // Recency of contact
    if (input.lastContactedAt) {
      const days = (Date.now() - new Date(input.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 7) factors.push({ label: "Contacted in last 7 days", points: 10 });
      else if (days <= 14) factors.push({ label: "Contacted in last 14 days", points: 5 });
    }

    // Scheduled follow-up adherence
    if (input.nextFollowUpAt && new Date(input.nextFollowUpAt) >= new Date()) {
      factors.push({ label: "Upcoming follow-up scheduled", points: 10 });
    }

    // Engagement signals
    if (input.activitiesCount && input.activitiesCount > 0) {
      factors.push({ label: `${input.activitiesCount} logged activities`, points: Math.min(10, input.activitiesCount * 2) });
    }
    if (input.hasInboundMsg) factors.push({ label: "Replied inbound", points: 10 });

    const raw = factors.reduce((sum, f) => sum + f.points, 0);
    return { score: Math.min(100, Math.max(0, raw)), factors };
  }

  /**
   * Pure scoring logic: calculate engagement score (0-100) based on lead data and activity signals.
   */
  static calculateScore(input: LeadScoreInput): number {
    return this.breakdown(input).score;
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

    const { score, factors } = this.breakdown({
      status: lead.status,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      lastContactedAt: lead.lastContactedAt,
      nextFollowUpAt: lead.nextFollowUpAt,
      activitiesCount: Number(actCount ?? 0),
      hasInboundMsg: !!inbound,
    });

    // Persist the number for sorting/filtering, and the "why" alongside it as evidence.
    const customData = { ...((lead.customData as Record<string, unknown>) ?? {}) };
    customData._scoreFactors = { score, factors, computedAt: new Date().toISOString() };

    await db.update(leads).set({ score, customData, updatedAt: new Date() }).where(eq(leads.id, leadId));
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
