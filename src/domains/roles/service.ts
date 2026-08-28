import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { ALL_PERMISSIONS } from "@/lib/permissions";

const cols = { id: roles.id, name: roles.name, permissions: roles.permissions, organizationId: roles.organizationId };

// Keep only recognised permission keys — never trust caller-supplied strings.
function clean(permissions: string[]) {
  return ALL_PERMISSIONS.filter((k) => permissions.includes(k));
}

export class RoleService {
  // Shared system roles (org null) plus this org's custom roles.
  static async list(organizationId: string) {
    return db
      .select(cols)
      .from(roles)
      .where(or(isNull(roles.organizationId), eq(roles.organizationId, organizationId)))
      .orderBy(roles.name);
  }

  static async create(organizationId: string, name: string, permissions: string[]) {
    const [r] = await db
      .insert(roles)
      .values({ organizationId, name, permissions: clean(permissions) })
      .returning(cols);
    return r;
  }

  // Only org-owned roles are editable — never a shared system role.
  static async update(organizationId: string, id: string, data: { name?: string; permissions?: string[] }) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) set.name = data.name;
    if (data.permissions !== undefined) set.permissions = clean(data.permissions);
    const [r] = await db
      .update(roles)
      .set(set)
      .where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)))
      .returning(cols);
    return r;
  }

  static async remove(organizationId: string, id: string) {
    // Unassign the role from users first so no one is left pointing at a deleted role.
    await db
      .update(users)
      .set({ roleId: null, updatedAt: new Date() })
      .where(and(eq(users.roleId, id), eq(users.organizationId, organizationId)));
    await db.delete(roles).where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)));
  }
}
