import { db } from "@/db";
import { teams } from "@/db/schema";

export class TeamService {
  static async list() {
    return db.select().from(teams).orderBy(teams.name);
  }

  static async create(name: string) {
    const [t] = await db.insert(teams).values({ name }).returning();
    return t;
  }
}
