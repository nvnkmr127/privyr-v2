import { db } from "@/db";
import { leadSources, leads, assignmentRules } from "@/db/schema/leads";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";

export class LeadSourceService {
  static async getSources(organizationId?: string) {
    if (organizationId) {
      return db.select().from(leadSources).where(eq(leadSources.organizationId, organizationId));
    }
    return db.select().from(leadSources);
  }

  static async getSource(id: string) {
    const [source] = await db.select().from(leadSources).where(eq(leadSources.id, id)).limit(1);
    return source;
  }

  static async createSource(data: { name: string; type: string; organizationId?: string; config?: any }) {
    const webhookSecret = crypto.randomBytes(32).toString("hex");
    
    const [source] = await db.insert(leadSources).values({
      name: data.name,
      type: data.type,
      organizationId: data.organizationId,
      config: data.config || {},
      webhookSecret,
    }).returning();
    
    return source;
  }

  // Deletes a source after detaching it from existing leads (FK is NO ACTION, so we null it)
  // and removing its assignment rules. Existing leads are kept, just un-sourced.
  static async deleteSource(id: string, organizationId: string) {
    await db.update(leads).set({ sourceId: null })
      .where(and(eq(leads.sourceId, id), eq(leads.organizationId, organizationId)));
    await db.delete(assignmentRules).where(eq(assignmentRules.sourceId, id));
    await db.delete(leadSources).where(and(eq(leadSources.id, id), eq(leadSources.organizationId, organizationId)));
    return { ok: true };
  }

  static async updateSource(
    id: string,
    data: { name?: string; isActive?: number; config?: any },
    organizationId?: string,
  ) {
    const scope = organizationId
      ? and(eq(leadSources.id, id), eq(leadSources.organizationId, organizationId))
      : eq(leadSources.id, id);
    const [updated] = await db.update(leadSources)
      .set(data)
      .where(scope)
      .returning();

    return updated;
  }
}
