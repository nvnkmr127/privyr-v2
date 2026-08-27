import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

// The tenant boundary. Returns the caller's org + identity; every tenant-scoped service
// takes organizationId from HERE, never from user input — this is the centralized scoping point.
export async function requireOrg() {
  const session = await requireAuth();
  const organizationId = session.user.organizationId;
  if (!organizationId) {
    throw new Error("No organization on session");
  }
  return { userId: session.user.id, organizationId, roleId: session.user.roleId };
}

// Resolve the current user's role name from the roleId carried in the JWT.
export async function currentRoleName(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const roleId = session?.user?.roleId;
  if (!roleId) return null;
  const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId)).limit(1);
  return role?.name ?? null;
}

// Throws "Forbidden" unless the signed-in user holds one of the allowed roles.
export async function requireRole(allowed: string[]) {
  const session = await requireAuth();
  const name = await currentRoleName();
  if (!name || !allowed.includes(name)) {
    throw new Error("Forbidden");
  }
  return session;
}

export function requireAdmin() {
  return requireRole(["admin"]);
}

export async function isAdmin(): Promise<boolean> {
  return (await currentRoleName()) === "admin";
}
