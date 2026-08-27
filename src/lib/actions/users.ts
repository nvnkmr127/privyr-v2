"use server";

import { requireAuth } from "@/lib/rbac";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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
