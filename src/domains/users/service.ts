import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Public shape — never leaks passwordHash.
const publicCols = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  isActive: users.isActive,
  teamId: users.teamId,
  createdAt: users.createdAt,
};

export class UserService {
  static async list() {
    return db.select(publicCols).from(users).orderBy(users.createdAt);
  }

  static async create(input: { email: string; firstName?: string; lastName?: string; password: string }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [u] = await db
      .insert(users)
      .values({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        isActive: true,
      })
      .returning(publicCols);
    return u;
  }

  static async setActive(id: string, isActive: boolean) {
    const [u] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(publicCols);
    return u;
  }

  static async setTeam(id: string, teamId: string | null) {
    const [u] = await db
      .update(users)
      .set({ teamId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(publicCols);
    return u;
  }
}
