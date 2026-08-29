"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/rbac";
import { SequenceService } from "@/domains/leads/sequenceService";

const stepSchema = z.object({
  dayOffset: z.coerce.number().int().min(0).max(365),
  channel: z.enum(["whatsapp", "email"]),
  body: z.string().min(1).max(2000),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  steps: z.array(stepSchema).min(1, "Add at least one step"),
});

export async function createSequenceAction(input: unknown) {
  const { organizationId } = await requireOrg();
  const { name, steps } = createSchema.parse(input);
  const seq = await SequenceService.create(organizationId, name, steps);
  revalidatePath("/sequences");
  return seq;
}

export async function listSequencesAction() {
  const { organizationId } = await requireOrg();
  return SequenceService.list(organizationId);
}

export async function enrollLeadsAction(sequenceId: string, leadIds: string[]) {
  const { organizationId } = await requireOrg();
  const res = await SequenceService.enroll(organizationId, sequenceId, leadIds);
  revalidatePath("/sequences");
  leadIds.forEach((id) => revalidatePath(`/leads/${id}`));
  return res;
}

export async function stopEnrollmentAction(enrollmentId: string, leadId?: string) {
  const { organizationId } = await requireOrg();
  const res = await SequenceService.stop(organizationId, enrollmentId);
  if (leadId) revalidatePath(`/leads/${leadId}`);
  return res;
}
