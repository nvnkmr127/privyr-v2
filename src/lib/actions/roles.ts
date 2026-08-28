"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { RoleService } from "@/domains/roles/service";
import { AuditService } from "@/domains/audit/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function listRolesAction() {
  const { organizationId } = await requireOrg();
  return RoleService.list(organizationId);
}

const roleSchema = z.object({
  name: z.string().trim().min(1).max(255),
  permissions: z.array(z.string()).default([]),
});

export async function createRoleAction(input: z.infer<typeof roleSchema>) {
  const { organizationId, userId } = await requirePermission("roles.manage");
  const data = roleSchema.parse(input);
  const role = await RoleService.create(organizationId, data.name, data.permissions);
  await AuditService.log({ organizationId, userId, action: "role.create", entityType: "role", entityId: role?.id, metadata: { name: data.name } });
  revalidatePath("/settings/users");
  return role;
}

export async function updateRoleAction(id: string, input: Partial<z.infer<typeof roleSchema>>) {
  const { organizationId } = await requirePermission("roles.manage");
  const role = await RoleService.update(organizationId, id, input);
  revalidatePath("/settings/users");
  return role;
}

export async function deleteRoleAction(id: string) {
  const { organizationId, userId } = await requirePermission("roles.manage");
  await RoleService.remove(organizationId, id);
  await AuditService.log({ organizationId, userId, action: "role.delete", entityType: "role", entityId: id });
  revalidatePath("/settings/users");
}
