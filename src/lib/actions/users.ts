"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { UserService } from "@/domains/users/service";
import { AuditService } from "@/domains/audit/service";
import { PlanService } from "@/domains/billing/planService";

// Active users of the caller's org for owner/assignee pickers. Returns a display name, not the raw record.
export async function listUsersAction() {
  const { organizationId } = await requireOrg();
  const rows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true), isNull(users.deletedAt)));
  return rows.map((u) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
  }));
}

// --- Full user management (requires users.manage, tenant-scoped) ---

export async function listAllUsersAction() {
  const { organizationId } = await requirePermission("users.manage");
  return UserService.list(organizationId);
}

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string().uuid().nullable().optional(),
});

export async function createUserAction(input: z.infer<typeof createUserSchema>) {
  const { organizationId, userId } = await requirePermission("users.manage");
  const data = createUserSchema.parse(input);
  await PlanService.assertCanAddSeat(organizationId);
  try {
    const user = await UserService.create(organizationId, data);
    await AuditService.log({ organizationId, userId, action: "user.create", entityType: "user", entityId: user.id, metadata: { email: data.email } });
    revalidatePath("/settings/users");
    return user;
  } catch (e: any) {
    // Unique violation on email.
    if (String(e?.message || e).includes("duplicate") || e?.code === "23505") {
      throw new Error("A user with that email already exists");
    }
    throw e;
  }
}

export async function setUserActiveAction(id: string, isActive: boolean) {
  const { organizationId, userId } = await requirePermission("users.manage");
  if (id === userId && !isActive) throw new Error("You cannot deactivate your own account");
  await UserService.setActive(organizationId, id, isActive);
  revalidatePath("/settings/users");
}

export async function setUserTeamAction(id: string, teamId: string | null) {
  const { organizationId } = await requirePermission("users.manage");
  await UserService.setTeam(organizationId, id, teamId);
  revalidatePath("/settings/users");
}

export async function setUserRoleAction(id: string, roleId: string | null) {
  const { organizationId, userId } = await requirePermission("users.manage");
  if (id === userId) throw new Error("You cannot change your own role");
  await UserService.setRole(organizationId, id, roleId);
  await AuditService.log({ organizationId, userId, action: "user.role_change", entityType: "user", entityId: id, metadata: { roleId } });
  revalidatePath("/settings/users");
}

export async function deleteUserAction(id: string) {
  const { organizationId, userId } = await requirePermission("users.manage");
  if (id === userId) throw new Error("You cannot delete your own account");
  await UserService.remove(organizationId, id);
  await AuditService.log({ organizationId, userId, action: "user.delete", entityType: "user", entityId: id });
  revalidatePath("/settings/users");
}
