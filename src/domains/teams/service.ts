import { db } from "@/db";
import { teams } from "@/db/schema";
import { eq } from "drizzle-orm";

export class TeamService {
  static async list(organizationId: string) {
    return db.select().from(teams).where(eq(teams.organizationId, organizationId)).orderBy(teams.name);
  }

  static async create(organizationId: string, name: string) {
    const [t] = await db.insert(teams).values({ organizationId, name }).returning();
    return t;
  }
}
