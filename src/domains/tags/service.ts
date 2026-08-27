import { db } from "@/db";
import { tags, leadTags } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export class TagService {
  static async listAll() {
    return db.select().from(tags).orderBy(tags.name);
  }

  static async getForLead(leadId: string) {
    return db
      .select({ id: tags.id, name: tags.name })
      .from(leadTags)
      .innerJoin(tags, eq(leadTags.tagId, tags.id))
      .where(eq(leadTags.leadId, leadId));
  }

  // Find-or-create the tag by name, then link it to the lead (idempotent both steps).
  static async addToLead(leadId: string, rawName: string) {
    const name = rawName.trim();
    if (!name) throw new Error("Tag name required");

    let [tag] = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
    if (!tag) {
      // onConflictDoNothing covers the race where two leads create the same new tag at once.
      await db.insert(tags).values({ name }).onConflictDoNothing();
      [tag] = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
    }

    const [linked] = await db
      .select()
      .from(leadTags)
      .where(and(eq(leadTags.leadId, leadId), eq(leadTags.tagId, tag.id)))
      .limit(1);
    if (!linked) {
      await db.insert(leadTags).values({ leadId, tagId: tag.id });
    }
    return { id: tag.id, name: tag.name };
  }

  static async removeFromLead(leadId: string, tagId: string) {
    await db.delete(leadTags).where(and(eq(leadTags.leadId, leadId), eq(leadTags.tagId, tagId)));
  }
}
