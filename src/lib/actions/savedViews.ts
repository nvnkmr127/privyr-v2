"use server";

import { requireOrg } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { SavedViewService, FilterGroup, FilterRule } from "@/domains/savedViews/service";
import { z } from "zod";

const createViewSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  filters: z.any(),
  sortField: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function createSavedViewAction(input: {
  name: string;
  filters: FilterGroup | FilterRule[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
}) {
  const { userId, organizationId } = await requireOrg();
  const parsed = createViewSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid view payload");
  }

  const view = await SavedViewService.createView(
    {
      name: parsed.data.name,
      filters: parsed.data.filters,
      sortField: parsed.data.sortField,
      sortOrder: parsed.data.sortOrder,
    },
    userId,
    organizationId,
  );

  revalidatePath("/leads");
  return view;
}

export async function updateSavedViewAction(input: {
  id: string;
  name?: string;
  filters?: FilterGroup | FilterRule[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
}) {
  const { organizationId } = await requireOrg();
  if (!input.id) throw new Error("View ID required");

  const view = await SavedViewService.updateView(
    input.id,
    {
      name: input.name,
      filters: input.filters,
      sortField: input.sortField,
      sortOrder: input.sortOrder,
    },
    organizationId,
  );

  revalidatePath("/leads");
  return view;
}

export async function deleteSavedViewAction(id: string) {
  const { organizationId } = await requireOrg();
  if (!id) throw new Error("View ID required");

  const success = await SavedViewService.deleteView(id, organizationId);
  revalidatePath("/leads");
  return { success };
}

export async function getSavedViewsAction() {
  const { userId, organizationId } = await requireOrg();
  return SavedViewService.listViews(organizationId, userId);
}
