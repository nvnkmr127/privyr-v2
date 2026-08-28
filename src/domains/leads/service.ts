import { db } from "@/db";
import { leads, leadStatusHistory, leadTags, tags } from "@/db/schema";
import {
  eq,
  ilike,
  and,
  or,
  desc,
  asc,
  sql,
  ne,
  isNull,
  isNotNull,
  lt,
  lte,
  gt,
  gte,
  exists,
  count,
} from "drizzle-orm";
import { eventBus } from "@/lib/events/emitter";
import { FilterGroup, FilterRule } from "@/domains/savedViews/service";

export type ListLeadsOptions = {
  organizationId: string;
  search?: string;
  status?: string;
  ownerId?: string;
  teamId?: string;
  sourceId?: string;
  stageId?: string;
  filters?: FilterGroup | FilterRule[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  currentUserId?: string;
};

export class LeadService {
  static async createLead(
    data: { name: string; email?: string; phone?: string; company?: string; ownerId?: string; teamId?: string; customData?: Record<string, unknown> },
    createdById: string | null,
    organizationId: string,
  ) {
    // Dedup within THIS org only — same email/phone in another tenant is a different lead.
    if (data.email || data.phone) {
      const orConds = [];
      if (data.email) orConds.push(eq(leads.email, data.email));
      if (data.phone) orConds.push(eq(leads.phone, data.phone));
      const [existing] = await db.select().from(leads)
        .where(and(eq(leads.organizationId, organizationId), or(...orConds)))
        .limit(1);
      if (existing) throw new Error("Duplicate lead found with the same email or phone");
    }

    const [newLead] = await db.insert(leads).values({
      organizationId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      ownerId: data.ownerId || createdById || null,
      teamId: data.teamId,
      customData: data.customData ?? {},
      status: "new",
    }).returning();

    eventBus.emit('lead.created', { leadId: newLead.id, userId: createdById ?? undefined });
    return newLead;
  }

  static async updateLead(
    leadId: string,
    data: Partial<{ name: string; email: string; phone: string; company: string }>,
    updatedById: string,
    organizationId: string,
  ) {
    const [updatedLead] = await db.update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
      .returning();
    if (updatedLead) eventBus.emit('lead.updated', { leadId, userId: updatedById, changes: data });
    return updatedLead;
  }

  static async updateCustomData(leadId: string, customData: Record<string, unknown>, organizationId: string) {
    const [updated] = await db.update(leads)
      .set({ customData, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
      .returning();
    return updated;
  }

  static async getLead(leadId: string, organizationId: string) {
    const [lead] = await db.select().from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
      .limit(1);
    return lead;
  }

  // Unscoped fetch for trusted internal callers only (event handlers, background workers)
  static async getLeadById(leadId: string) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    return lead;
  }

  private static buildRuleCondition(rule: FilterRule, currentUserId?: string) {
    let rawVal = rule.value;
    if (rawVal === "me" && currentUserId) {
      rawVal = currentUserId;
    }

    const op = rule.operator;

    // Special field helpers
    if (rule.field === "tag" || rule.field === "tagId") {
      const tagVal = String(rawVal || "");
      if (op === "is_empty") {
        return sql`NOT EXISTS (SELECT 1 FROM ${leadTags} WHERE ${leadTags.leadId} = ${leads.id})`;
      }
      if (op === "is_not_empty") {
        return sql`EXISTS (SELECT 1 FROM ${leadTags} WHERE ${leadTags.leadId} = ${leads.id})`;
      }
      return exists(
        db
          .select({ id: leadTags.leadId })
          .from(leadTags)
          .innerJoin(tags, eq(leadTags.tagId, tags.id))
          .where(
            and(
              eq(leadTags.leadId, leads.id),
              or(eq(tags.id, tagVal), eq(tags.name, tagVal), ilike(tags.name, `%${tagVal}%`)),
            ),
          ),
      );
    }

    if (rule.field.startsWith("customData.")) {
      const key = rule.field.replace("customData.", "");
      const jsonPath = sql`${leads.customData}->>${key}`;
      const strVal = String(rawVal ?? "");

      switch (op) {
        case "equals":
          return eq(jsonPath, strVal);
        case "not_equals":
          return ne(jsonPath, strVal);
        case "contains":
          return ilike(jsonPath, `%${strVal}%`);
        case "does_not_contain":
          return sql`${jsonPath} NOT ILIKE ${"%" + strVal + "%"}`;
        case "is_empty":
          return or(isNull(jsonPath), eq(jsonPath, ""));
        case "is_not_empty":
          return and(isNotNull(jsonPath), ne(jsonPath, ""));
        default:
          return eq(jsonPath, strVal);
      }
    }

    // Standard column mapping
    const colMap: Record<string, any> = {
      status: leads.status,
      ownerId: leads.ownerId,
      teamId: leads.teamId,
      sourceId: leads.sourceId,
      stageId: leads.stageId,
      pipelineId: leads.pipelineId,
      priority: leads.priority,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      company: leads.company,
      score: leads.score,
      expectedValue: leads.expectedValue,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      nextFollowUpAt: leads.nextFollowUpAt,
    };

    const col = colMap[rule.field];
    if (!col) return undefined;

    const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : "";

    switch (op) {
      case "equals":
        if (rawVal === null || strVal === "" || strVal === "null") {
          return isNull(col);
        }
        return eq(col, rawVal as any);

      case "not_equals":
        if (rawVal === null || strVal === "" || strVal === "null") {
          return isNotNull(col);
        }
        return ne(col, rawVal as any);

      case "contains":
        return ilike(col, `%${strVal}%`);

      case "does_not_contain":
        return sql`${col} NOT ILIKE ${"%" + strVal + "%"}`;

      case "is_empty":
        return or(isNull(col), eq(col, ""));

      case "is_not_empty":
        return and(isNotNull(col), ne(col, ""));

      case "before": {
        const d = strVal === "now" ? new Date() : new Date(strVal);
        return lt(col, d);
      }

      case "after": {
        const d = strVal === "now" ? new Date() : new Date(strVal);
        return gt(col, d);
      }

      case "between": {
        let dates: [Date, Date];
        if (Array.isArray(rawVal) && rawVal.length === 2) {
          dates = [new Date(rawVal[0]), new Date(rawVal[1])];
        } else if (typeof rawVal === "string" && rawVal.includes(",")) {
          const parts = rawVal.split(",");
          dates = [new Date(parts[0]), new Date(parts[1])];
        } else {
          dates = [new Date(0), new Date()];
        }
        return and(gte(col, dates[0]), lte(col, dates[1]));
      }

      case "gt":
        return gt(col, isNaN(Number(rawVal)) ? rawVal : Number(rawVal));

      case "lt":
        return lt(col, isNaN(Number(rawVal)) ? rawVal : Number(rawVal));

      default:
        return eq(col, rawVal as any);
    }
  }

  static async listLeads(options: ListLeadsOptions) {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.max(options.limit || 50, 1);
    const offset = (page - 1) * limit;

    const baseConditions = [eq(leads.organizationId, options.organizationId)];

    // Global Search (Name, Phone, Email, Company)
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      const rawDigits = term.replace(/[^0-9]/g, "");

      const searchConds = [
        ilike(leads.name, `%${term}%`),
        ilike(leads.email, `%${term}%`),
        ilike(leads.company, `%${term}%`),
      ];

      if (rawDigits.length >= 3) {
        searchConds.push(
          sql`regexp_replace(${leads.phone}, '[^0-9]', '', 'g') ILIKE ${"%" + rawDigits + "%"}`,
        );
      } else {
        searchConds.push(ilike(leads.phone, `%${term}%`));
      }

      baseConditions.push(or(...searchConds)!);
    }

    // Shortcut params
    if (options.status) baseConditions.push(eq(leads.status, options.status));
    if (options.ownerId) {
      if (options.ownerId === "null" || options.ownerId === "unassigned") {
        baseConditions.push(isNull(leads.ownerId));
      } else {
        baseConditions.push(eq(leads.ownerId, options.ownerId));
      }
    }
    if (options.teamId) baseConditions.push(eq(leads.teamId, options.teamId));
    if (options.sourceId) baseConditions.push(eq(leads.sourceId, options.sourceId));
    if (options.stageId) baseConditions.push(eq(leads.stageId, options.stageId));

    // Structured Filters (Group or Rules array)
    if (options.filters) {
      let rules: FilterRule[] = [];
      let logic: "AND" | "OR" = "AND";

      if (Array.isArray(options.filters)) {
        rules = options.filters;
      } else if (options.filters.rules) {
        rules = options.filters.rules;
        logic = options.filters.logic || "AND";
      }

      const ruleConds = rules
        .map((r) => this.buildRuleCondition(r, options.currentUserId))
        .filter(Boolean);

      if (ruleConds.length > 0) {
        if (logic === "OR") {
          baseConditions.push(or(...ruleConds)!);
        } else {
          baseConditions.push(and(...ruleConds)!);
        }
      }
    }

    const where = and(...baseConditions);

    // Sorting
    let sortCol: any = leads.createdAt;
    if (options.sortField === "updatedAt") sortCol = leads.updatedAt;
    else if (options.sortField === "name") sortCol = leads.name;
    else if (options.sortField === "status") sortCol = leads.status;
    else if (options.sortField === "ownerId") sortCol = leads.ownerId;
    else if (options.sortField === "nextFollowUpAt") sortCol = leads.nextFollowUpAt;
    else if (options.sortField === "priority") sortCol = leads.priority;
    else if (options.sortField === "score") sortCol = leads.score;

    const orderExpr = options.sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

    const [data, [{ total }]] = await Promise.all([
      db.select().from(leads).where(where).orderBy(orderExpr).limit(limit).offset(offset),
      db.select({ total: count() }).from(leads).where(where),
    ]);

    const totalCount = Number(total || 0);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      data,
      total: totalCount,
      page,
      limit,
      totalPages,
    };
  }

  static async listLeadsByStage(organizationId: string, limitPerStage = 20) {
    const statuses = ["new", "active", "won", "lost", "unqualified"];
    const results: Record<string, { data: any[]; total: number }> = {};

    for (const st of statuses) {
      const { data, total } = await this.listLeads({
        organizationId,
        status: st,
        page: 1,
        limit: limitPerStage,
      });
      results[st] = { data, total };
    }

    return results;
  }

  static async deleteLead(leadId: string, _deletedById: string, organizationId: string) {
    const [deletedLead] = await db.delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
      .returning();
    return deletedLead;
  }

  // Delegate to canonical AssignmentService
  static async assignLead(leadId: string, ownerId: string | null, assignedById?: string, organizationId?: string) {
    const { AssignmentService } = await import("./assignmentService");
    return AssignmentService.assignLead({
      leadId,
      ownerId,
      assignedById: assignedById ?? "system",
      organizationId,
    });
  }

  static async changeStatus(leadId: string, newStatus: string, changedById: string, organizationId?: string) {
    const idWhere = organizationId
      ? and(eq(leads.id, leadId), eq(leads.organizationId, organizationId))
      : eq(leads.id, leadId);

    const [currentLead] = await db.select({ status: leads.status }).from(leads).where(idWhere).limit(1);
    if (!currentLead) throw new Error("Lead not found");
    if (currentLead.status === newStatus) return currentLead;

    const [updatedLead] = await db.update(leads)
      .set({ status: newStatus, updatedAt: new Date() }).where(idWhere).returning();

    await db.insert(leadStatusHistory).values({
      leadId, oldStatus: currentLead.status, newStatus, changedById,
    });
    eventBus.emit('lead.status_changed', { leadId, oldStatus: currentLead.status, newStatus });
    return updatedLead;
  }
}
