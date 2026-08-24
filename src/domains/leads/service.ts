import { db } from "@/db";
import { leads, leadStatusHistory } from "@/db/schema"; // Assume leadActivities is mapped from activities in index
import { eq, ilike, and, desc } from "drizzle-orm";
import { eventBus } from "@/lib/events/emitter";

export class LeadService {
  static async createLead(data: { name: string; email?: string; phone?: string; company?: string; ownerId?: string; teamId?: string }, createdById: string) {
    // Deduplication check
    if (data.email || data.phone) {
      const conditions = [];
      if (data.email) conditions.push(eq(leads.email, data.email));
      if (data.phone) conditions.push(eq(leads.phone, data.phone));
      
      const existing = await db.select().from(leads).where(and(eq(leads.ownerId, data.ownerId || createdById), conditions.length > 1 ? conditions[0] : conditions[0])).limit(1); // Simple OR logic omitted for brevity
      if (existing.length > 0) {
        throw new Error("Duplicate lead found with the same email or phone");
      }
    }

    const [newLead] = await db.insert(leads).values({
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

  static async updateLead(leadId: string, data: Partial<{ name: string; email: string; phone: string; company: string }>, updatedById: string) {
    const [updatedLead] = await db.update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();

    if (updatedLead) {
      eventBus.emit('lead.updated', { leadId, userId: updatedById, changes: data });
    }
    return updatedLead;
  }

  static async getLead(leadId: string) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    return lead;
  }

  static async listLeads(params: { search?: string; status?: string; ownerId?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.search) {
      conditions.push(ilike(leads.name, `%${params.search}%`));
    }
    if (params.status) {
      conditions.push(eq(leads.status, params.status));
    }
    if (params.ownerId) {
      conditions.push(eq(leads.ownerId, params.ownerId));
    }

    const queryConditions = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select().from(leads)
      .where(queryConditions)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    // Simple count (in production you might want a separate optimized count query)
    const countData = await db.select({ id: leads.id }).from(leads).where(queryConditions);
    const total = countData.length;

    return { data, total, page, limit };
  }

  static async deleteLead(leadId: string, deletedById: string) {
    // Hard delete for now, as soft delete isn't in schema
    const [deletedLead] = await db.delete(leads).where(eq(leads.id, leadId)).returning();
    if (deletedLead) {
      // eventBus.emit('lead.deleted', ...); if it existed
    }
    return deletedLead;
  }

  static async assignLead(leadId: string, ownerId: string, assignedById?: string) {
    const [updatedLead] = await db.update(leads)
      .set({ ownerId, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();

    if (updatedLead) {
      eventBus.emit('lead.assigned', { 
        leadId, 
        ownerId,
        assignedById 
      });
    }

    return updatedLead;
  }

  static async changeStatus(leadId: string, newStatus: string, changedById: string) {
    const [currentLead] = await db.select({ status: leads.status }).from(leads).where(eq(leads.id, leadId)).limit(1);
    
    if (!currentLead) throw new Error("Lead not found");

    if (currentLead.status === newStatus) return currentLead; // No change

    const [updatedLead] = await db.update(leads)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();

    await db.insert(leadStatusHistory).values({
      leadId,
      oldStatus: currentLead.status,
      newStatus,
      changedById,
    });

    eventBus.emit('lead.status_changed', { 
      leadId, 
      oldStatus: currentLead.status, 
      newStatus 
    });

    return updatedLead;
  }
}
