"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { TeamService } from "@/domains/teams/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function listTeamsAction() {
  const { organizationId } = await requireOrg();
  return TeamService.list(organizationId);
}

const createTeamSchema = z.object({ name: z.string().min(1).max(255) });

export async function createTeamAction(input: z.infer<typeof createTeamSchema>) {
  const { organizationId } = await requirePermission("users.manage");
  const { name } = createTeamSchema.parse(input);
  const team = await TeamService.create(organizationId, name);
  revalidatePath("/settings/users");
  return team;
}
