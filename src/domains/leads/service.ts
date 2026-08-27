import { db } from "@/db";
import { leads, leadStatusHistory } from "@/db/schema";
import { eq, ilike, and, or, desc } from "drizzle-orm";
import { eventBus } from "@/lib/events/emitter";

// TENANT SCOPING: every method takes organizationId (sourced from requireOrg() at the action/page
// boundary, never from user input) and every query filters by it. This is the isolation contract.
export class LeadService {
  static async createLead(
    data: { name: string; email?: string; phone?: string; company?: string; ownerId?: string; teamId?: string },
    createdById: string,
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
      ownerId: data.ownerId || createdById,
      teamId: data.teamId,
      status: "new",
    }).returning();

    eventBus.emit('lead.created', { leadId: newLead.id, userId: createdById });
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

  // Unscoped fetch for trusted internal callers only (event handlers, background workers) that
  // act on a lead by id from an internal event, not a user request. Never call from a UI path.
  static async getLeadById(leadId: string) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    return lead;
  }

  static async listLeads(params: {
    organizationId: string;
    search?: string; status?: string; ownerId?: string; page?: number; limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(leads.organizationId, params.organizationId)];
    if (params.search) conditions.push(ilike(leads.name, `%${params.search}%`));
    if (params.status) conditions.push(eq(leads.status, params.status));
    if (params.ownerId) conditions.push(eq(leads.ownerId, params.ownerId));
    const where = and(...conditions);

    const data = await db.select().from(leads).where(where)
      .orderBy(desc(leads.createdAt)).limit(limit).offset(offset);
    const countData = await db.select({ id: leads.id }).from(leads).where(where);
    return { data, total: countData.length, page, limit };
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
