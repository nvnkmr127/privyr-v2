"use server";

import { requireAuth, requireAdmin } from "@/lib/rbac";
import { TeamService } from "@/domains/teams/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function listTeamsAction() {
  await requireAuth();
  return TeamService.list();
}

const createTeamSchema = z.object({ name: z.string().min(1).max(255) });

export async function createTeamAction(input: z.infer<typeof createTeamSchema>) {
  await requireAdmin();
  const { name } = createTeamSchema.parse(input);
  const team = await TeamService.create(name);
  revalidatePath("/settings/users");
  return team;
}
