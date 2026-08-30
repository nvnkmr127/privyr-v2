"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { TeamService } from "@/domains/teams/service";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ok, fail, actionFail } from "@/lib/actions/result";

export async function listTeamsAction() {
  const { organizationId } = await requireOrg();
  return TeamService.list(organizationId);
}

const createTeamSchema = z.object({ name: z.string().min(1).max(255) });

export async function createTeamAction(input: z.infer<typeof createTeamSchema>) {
  const { organizationId } = await requirePermission("users.manage");
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Please enter a team name.");
  try {
    const team = await TeamService.create(organizationId, parsed.data.name);
    revalidatePath("/settings/users");
    return ok(team);
  } catch (e) {
    return actionFail(e);
  }
}
