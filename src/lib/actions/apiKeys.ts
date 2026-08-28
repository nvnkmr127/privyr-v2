"use server";

import { requirePermission } from "@/lib/rbac";
import { ApiKeyService } from "@/domains/apiKeys/service";
import { AuditService } from "@/domains/audit/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function listApiKeysAction() {
  const { organizationId } = await requirePermission("api.manage");
  return ApiKeyService.list(organizationId);
}

export async function createApiKeyAction(name: string) {
  const { organizationId, userId } = await requirePermission("api.manage");
  const parsed = z.string().trim().min(1).max(255).parse(name);
  const created = await ApiKeyService.create(organizationId, parsed, userId);
  await AuditService.log({ organizationId, userId, action: "api_key.create", entityType: "api_key", entityId: created.id, metadata: { name: parsed } });
  revalidatePath("/settings/api");
  return created; // includes the raw key — shown once
}

export async function revokeApiKeyAction(id: string) {
  const { organizationId, userId } = await requirePermission("api.manage");
  await ApiKeyService.revoke(organizationId, id);
  await AuditService.log({ organizationId, userId, action: "api_key.revoke", entityType: "api_key", entityId: id });
  revalidatePath("/settings/api");
}
