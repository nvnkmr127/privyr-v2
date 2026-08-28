import { db } from "@/db";
import { leads, activities } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export interface LossReasonSummary {
  reason: string;
  count: number;
  percentage: number;
}

export interface WinLossAnalytics {
  totalClosedLeads: number;
  wonCount: number;
  lostCount: number;
  unqualifiedCount: number;
  winRatePercentage: number;
  lossReasonBreakdown: LossReasonSummary[];
}

export class WinLossAnalyticsService {
  /**
   * Computes win/loss performance metrics and categorizes loss reason taxonomies.
   */
  static async getWinLossAnalytics(organizationId: string): Promise<WinLossAnalytics> {
    const closedLeads = await db
      .select({
        id: leads.id,
        status: leads.status,
      })
      .from(leads)
      .where(
        and(
          eq(leads.organizationId, organizationId),
          inArray(leads.status, ["won", "lost", "unqualified"])
        )
      );

    if (closedLeads.length === 0) {
      return {
        totalClosedLeads: 0,
        wonCount: 0,
        lostCount: 0,
        unqualifiedCount: 0,
        winRatePercentage: 0,
        lossReasonBreakdown: [],
      };
    }

    let wonCount = 0;
    let lostCount = 0;
    let unqualifiedCount = 0;
    const lostLeadIds: string[] = [];

    for (const lead of closedLeads) {
      if (lead.status === "won") {
        wonCount++;
      } else if (lead.status === "lost") {
        lostCount++;
        lostLeadIds.push(lead.id);
      } else if (lead.status === "unqualified") {
        unqualifiedCount++;
        lostLeadIds.push(lead.id);
      }
    }

    const winRatePercentage =
      closedLeads.length > 0 ? Math.round((wonCount / closedLeads.length) * 1000) / 10 : 0;

    // Fetch activity notes for lost/unqualified leads to categorize loss reasons
    const lossMap: Record<string, number> = {
      "Price / Budget Constraints": 0,
      "Competitor Selected": 0,
      "Product Fit / Missing Features": 0,
      "No Response / Ghosted": 0,
      "Unqualified / Out of Scope": 0,
      "Other / Unspecified": 0,
    };

    if (lostLeadIds.length > 0) {
      const notes = await db
        .select({
          content: activities.content,
        })
        .from(activities)
        .where(
          and(
            inArray(activities.leadId, lostLeadIds),
            eq(activities.type, "note")
          )
        );

      for (const note of notes) {
        const text = (note.content || "").toLowerCase();
        if (text.includes("price") || text.includes("budget") || text.includes("expensive")) {
          lossMap["Price / Budget Constraints"]++;
        } else if (text.includes("competitor") || text.includes("chose another")) {
          lossMap["Competitor Selected"]++;
        } else if (text.includes("feature") || text.includes("fit") || text.includes("requirement")) {
          lossMap["Product Fit / Missing Features"]++;
        } else if (text.includes("no response") || text.includes("ghost") || text.includes("unreachable")) {
          lossMap["No Response / Ghosted"]++;
        } else if (text.includes("unqualified") || text.includes("not interested")) {
          lossMap["Unqualified / Out of Scope"]++;
        } else {
          lossMap["Other / Unspecified"]++;
        }
      }
    }

    const totalLostReasonHits = Object.values(lossMap).reduce((a, b) => a + b, 0) || 1;

    const lossReasonBreakdown: LossReasonSummary[] = Object.entries(lossMap)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: Math.round((count / totalLostReasonHits) * 1000) / 10,
      }))
      .filter((item) => item.count > 0);

    lossReasonBreakdown.sort((a, b) => b.count - a.count);

    return {
      totalClosedLeads: closedLeads.length,
      wonCount,
      lostCount,
      unqualifiedCount,
      winRatePercentage,
      lossReasonBreakdown,
    };
  }
}
