"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { CustomFieldService } from "@/domains/customFields/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function listCustomFieldsAction() {
  const { organizationId } = await requireOrg();
  return CustomFieldService.list(organizationId);
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(["text", "number", "date", "select"]),
  options: z.array(z.string().trim().min(1)).default([]),
  required: z.boolean().default(false),
});

export async function createCustomFieldAction(input: z.infer<typeof createSchema>) {
  const { organizationId } = await requirePermission("settings.manage");
  const data = createSchema.parse(input);
  const row = await CustomFieldService.create(organizationId, data);
  revalidatePath("/settings/custom-fields");
  return row;
}

export async function deleteCustomFieldAction(id: string) {
  const { organizationId } = await requirePermission("settings.manage");
  await CustomFieldService.remove(organizationId, id);
  revalidatePath("/settings/custom-fields");
}
