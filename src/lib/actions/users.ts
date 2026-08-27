"use server";

import { requireAuth, requireAdmin } from "@/lib/rbac";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { UserService } from "@/domains/users/service";

// Active users for owner/assignee pickers. Returns a display name, not the raw record.
export async function listUsersAction() {
  await requireAuth();
  const rows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(eq(users.isActive, true));
  return rows.map((u) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
  }));
}

// --- Admin: full user management (admin role required) ---

export async function listAllUsersAction() {
  await requireAdmin();
  return UserService.list();
}

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function createUserAction(input: z.infer<typeof createUserSchema>) {
  await requireAdmin();
  const data = createUserSchema.parse(input);
  try {
    const user = await UserService.create(data);
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
  await requireAdmin();
  await UserService.setActive(id, isActive);
  revalidatePath("/settings/users");
}

export async function setUserTeamAction(id: string, teamId: string | null) {
  await requireAdmin();
  await UserService.setTeam(id, teamId);
  revalidatePath("/settings/users");
}
