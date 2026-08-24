import { db } from "@/db";
import { leads, leadIngestionLogs } from "@/db/schema";
import { NormalizedLeadPayload } from "../integrations/types";
import { eq, or } from "drizzle-orm";
import { eventBus } from "@/lib/events/emitter";
import { LeadService } from "@/domains/leads/service";

export class IngestionService {
  /**
   * Processes a normalized lead payload.
   * Handles deduplication and insertion.
   */
  static async processLead(payload: NormalizedLeadPayload): Promise<{ status: string; leadId: string }> {
    if (!payload.email && !payload.phone) {
      await this.logIngestion(null, payload.sourceId, payload, "failed", "Email or phone is required for deduplication.");
      throw new Error("Email or phone is required");
    }

    const conditions = [];
    if (payload.email) conditions.push(eq(leads.email, payload.email));
    if (payload.phone) conditions.push(eq(leads.phone, payload.phone));
    if (payload.externalId) {
      // we check customData->>'externalId' if we don't have a dedicated column
      // but if we don't have raw sql easily accessible, we rely on email/phone.
      // Assuming email/phone are primary.
    }

    // 1. Deduplication
    const [existingLead] = await db
      .select()
      .from(leads)
      .where(or(...conditions))
      .limit(1);

    if (existingLead) {
      // Basic Deduplication: We update the existing lead's custom data and updated_at
      const [updatedLead] = await db.update(leads)
        .set({
          customData: { ...(existingLead.customData as Record<string, any>), ...payload.customData, _lastIngestionSource: payload.sourceId },
          updatedAt: new Date(),
        })
        .where(eq(leads.id, existingLead.id))
        .returning();

      await this.logIngestion(updatedLead.id, payload.sourceId, payload, "deduplicated", null);
      
      eventBus.emit('lead.updated', { 
        leadId: updatedLead.id, 
        sourceId: payload.sourceId,
        changes: payload.customData 
      });

      return { status: "deduplicated", leadId: updatedLead.id };
    }

    // 2. Creation
    const [newLead] = await db.insert(leads).values({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      company: payload.company,
      sourceId: payload.sourceId,
      customData: payload.customData,
    }).returning();

    await this.logIngestion(newLead.id, payload.sourceId, payload, "success", null);
    
    eventBus.emit('lead.created', {
      leadId: newLead.id,
      sourceId: payload.sourceId
    });

    // 3. Assignment Rules Engine
    if (payload.ownerId) {
      await LeadService.assignLead(newLead.id, payload.ownerId);
    } else {
      const { AssignmentService } = await import("@/domains/leads/assignmentService");
      await AssignmentService.executeAutomaticAssignment(newLead.id, payload.sourceId);
    }

    return { status: "success", leadId: newLead.id };
  }

  static async logIngestion(leadId: string | null, sourceId: string, payload: any, status: string, error: string | null) {
    await db.insert(leadIngestionLogs).values({
      leadId,
      sourceId,
      originalPayload: payload,
      status,
      error,
    });
  }
}
