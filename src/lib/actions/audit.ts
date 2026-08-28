"use server";

import { requirePermission } from "@/lib/rbac";
import { AuditService } from "@/domains/audit/service";

export async function listAuditLogsAction() {
  const { organizationId } = await requirePermission("audit.view");
  return AuditService.list(organizationId);
}
