import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Public shape — never leaks passwordHash.
const publicCols = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  isActive: users.isActive,
  roleId: users.roleId,
  teamId: users.teamId,
  createdAt: users.createdAt,
};

// Every method is tenant-scoped: it takes organizationId from the caller (which reads it
// from the session, never user input) and filters on it. Deleted users are hidden.
export class UserService {
  static async list(organizationId: string) {
    return db
      .select(publicCols)
      .from(users)
      .where(and(eq(users.organizationId, organizationId), isNull(users.deletedAt)))
      .orderBy(users.createdAt);
  }

  static async create(
    organizationId: string,
    input: { email: string; firstName?: string; lastName?: string; password: string; roleId?: string | null },
  ) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [u] = await db
      .insert(users)
      .values({
        organizationId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId ?? null,
        passwordHash,
        isActive: true,
      })
      .returning(publicCols);
    return u;
  }

  static async setActive(organizationId: string, id: string, isActive: boolean) {
    const [u] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning(publicCols);
    return u;
  }

  static async setTeam(organizationId: string, id: string, teamId: string | null) {
    const [u] = await db
      .update(users)
      .set({ teamId, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning(publicCols);
    return u;
  }

  static async setRole(organizationId: string, id: string, roleId: string | null) {
    const [u] = await db
      .update(users)
      .set({ roleId, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning(publicCols);
    return u;
  }

  // Soft delete — hard delete would orphan leads/activities/notifications that FK to this user.
  static async remove(organizationId: string, id: string) {
    await db
      .update(users)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)));
  }
}
