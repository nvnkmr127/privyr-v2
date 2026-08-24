import { db } from "@/db";
import { leadSources } from "@/db/schema/leads";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export class LeadSourceService {
  static async getSources() {
    return db.select().from(leadSources);
  }

  static async getSource(id: string) {
    const [source] = await db.select().from(leadSources).where(eq(leadSources.id, id)).limit(1);
    return source;
  }

  static async createSource(data: { name: string; type: string; config?: any }) {
    const webhookSecret = crypto.randomBytes(32).toString("hex");
    
    const [source] = await db.insert(leadSources).values({
      name: data.name,
      type: data.type,
      config: data.config || {},
      webhookSecret,
    }).returning();
    
    return source;
  }

  static async updateSource(id: string, data: { name?: string; isActive?: number; config?: any }) {
    const [updated] = await db.update(leadSources)
      .set(data)
      .where(eq(leadSources.id, id))
      .returning();
      
    return updated;
  }
}
