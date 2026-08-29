import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PermissionKey } from "@/lib/permissions";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

// The tenant boundary. Returns the caller's org + identity; every tenant-scoped service
// takes organizationId from HERE, never from user input — this is the centralized scoping point.
export async function requireOrg() {
  const session = await requireAuth();
  const organizationId = session.user.organizationId;
  if (!organizationId) {
    redirect("/login");
  }
  return { userId: session.user.id, organizationId, roleId: session.user.roleId };
}

// Resolve the current user's role (name + permissions) from the roleId carried in the JWT.
async function currentRole(): Promise<{ name: string; permissions: string[] } | null> {
  const session = await getServerSession(authOptions);
  const roleId = session?.user?.roleId;
  if (!roleId) return null;
  const [role] = await db
    .select({ name: roles.name, permissions: roles.permissions })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  return role ? { name: role.name, permissions: role.permissions ?? [] } : null;
}

export async function currentRoleName(): Promise<string | null> {
  return (await currentRole())?.name ?? null;
}

// admin implicitly has every permission; other roles must list the key explicitly.
export async function hasPermission(key: PermissionKey): Promise<boolean> {
  const role = await currentRole();
  if (!role) return false;
  // Admin (any casing) and the "*" wildcard grant every permission — as the seed intends.
  return role.name.toLowerCase() === "admin" || role.permissions.includes("*") || role.permissions.includes(key);
}

// Throws "Forbidden" unless the caller holds the permission; returns the tenant scope on success.
export async function requirePermission(key: PermissionKey) {
  const { organizationId, userId } = await requireOrg();
  if (!(await hasPermission(key))) throw new Error("Forbidden");
  return { organizationId, userId };
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
