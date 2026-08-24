"use server";

import { requireAuth } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { FollowUpService } from "@/domains/follow-ups/service";

const followUpSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["Call", "WhatsApp", "Email", "Meeting", "Task", "Note", "Custom"]),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  dueAt: z.coerce.date(),
  userId: z.string().uuid().optional(), // Can assign to someone else, default to self
});

export async function createFollowUp(input: z.infer<typeof followUpSchema>) {
  const session = await requireAuth();
  
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }
  
  const { leadId, type, title, description, dueAt, userId } = parsed.data;

  const followUp = await FollowUpService.createFollowUp({
    leadId,
    type,
    title,
    description,
    dueAt,
    userId: userId || session.user.id,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/follow-ups');
  return followUp;
}

export async function completeFollowUp(id: string) {
  await requireAuth();
  const updated = await FollowUpService.completeFollowUp(id);

  if (updated) {
    revalidatePath(`/leads/${updated.leadId}`);
    revalidatePath('/follow-ups');
  }
  return updated;
}

export async function cancelFollowUp(id: string) {
  await requireAuth();
  const updated = await FollowUpService.cancelFollowUp(id);

  if (updated) {
    revalidatePath(`/leads/${updated.leadId}`);
    revalidatePath('/follow-ups');
  }
  return updated;
}

export async function snoozeFollowUp(id: string, snoozedUntil: Date) {
  await requireAuth();
  const updated = await FollowUpService.snoozeFollowUp(id, snoozedUntil);

  if (updated) {
    revalidatePath(`/leads/${updated.leadId}`);
    revalidatePath('/follow-ups');
  }
  return updated;
}

export async function rescheduleFollowUp(id: string, dueAt: Date) {
  await requireAuth();
  const updated = await FollowUpService.rescheduleFollowUp(id, dueAt);

  if (updated) {
    revalidatePath(`/leads/${updated.leadId}`);
    revalidatePath('/follow-ups');
  }
  return updated;
}

export async function assignFollowUp(id: string, userId: string) {
  await requireAuth();
  const updated = await FollowUpService.assignFollowUp(id, userId);

  if (updated) {
    revalidatePath(`/leads/${updated.leadId}`);
    revalidatePath('/follow-ups');
  }
  return updated;
}
