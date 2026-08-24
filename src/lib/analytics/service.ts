import { db } from "@/db";
import { leads, followUps } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export interface AnalyticsFilters {
  ownerId?: string;
  teamId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AnalyticsService {
  /**
   * Retrieves high-level KPI metrics for leads.
   */
  static async getLeadMetrics(filters: AnalyticsFilters = {}) {
    const conditions = this.buildLeadConditions(filters);
    const baseQuery = db.select().from(leads);
    const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
    
    const allLeads = await query;
    
    const total = allLeads.length;
    const newLeads = allLeads.filter(l => l.status === 'new').length;
    const qualified = allLeads.filter(l => l.status === 'active' || l.status === 'won').length;
    const unqualified = allLeads.filter(l => l.status === 'unqualified').length;
    const won = allLeads.filter(l => l.status === 'won').length;
    const lost = allLeads.filter(l => l.status === 'lost').length;
    
    // Formula: Won / (Won + Lost)
    const closed = won + lost;
    const conversionRate = closed > 0 ? (won / closed) * 100 : 0;
    
    const pipelineValue = allLeads
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + Number(l.expectedValue || 0), 0);
      
    const expectedRevenue = allLeads
      .filter(l => l.status === 'won')
      .reduce((sum, l) => sum + Number(l.expectedValue || 0), 0);

    return {
      total,
      newLeads,
      qualified,
      unqualified,
      won,
      lost,
      conversionRate,
      pipelineValue,
      expectedRevenue
    };
  }

  /**
   * Retrieves follow-up specific metrics.
   */
  static async getFollowUpMetrics(filters: AnalyticsFilters = {}) {
    const conditions = [];
    if (filters.ownerId) conditions.push(eq(followUps.userId, filters.ownerId));
    
    const baseQuery = db.select().from(followUps);
    const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
    
    const allFollowUps = await query;
    const now = new Date();
    
    const total = allFollowUps.length;
    const completed = allFollowUps.filter(f => f.status === 'completed').length;
    const overdue = allFollowUps.filter(f => f.status === 'pending' && new Date(f.dueAt) < now).length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      total,
      overdue,
      completed,
      completionRate
    };
  }

  /**
   * Helper to build SQL conditions for leads based on filters.
   */
  private static buildLeadConditions(filters: AnalyticsFilters) {
    const conditions = [];
    if (filters.ownerId) conditions.push(eq(leads.ownerId, filters.ownerId));
    if (filters.teamId) conditions.push(eq(leads.teamId, filters.teamId));
    if (filters.startDate) conditions.push(gte(leads.createdAt, filters.startDate));
    if (filters.endDate) conditions.push(lte(leads.createdAt, filters.endDate));
    return conditions;
  }
}
