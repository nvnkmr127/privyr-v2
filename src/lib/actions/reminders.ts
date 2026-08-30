"use server";

import { db } from "@/db";
import { followUps, leads } from "@/db/schema";
import { requireOrg } from "@/lib/rbac";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ActivityService } from "@/domains/activities/service";
import { assertLeadInOrg } from "@/domains/leads/ownership";
import { z } from "zod";

const createReminderSchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().default("followup"),
  dueAt: z.string().or(z.date()),
});

export async function createReminderAction(input: z.infer<typeof createReminderSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = createReminderSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid reminder data");
  }

  await assertLeadInOrg(parsed.data.leadId, organizationId);

  const dueDate = new Date(parsed.data.dueAt);

  const [reminder] = await db
    .insert(followUps)
    .values({
      leadId: parsed.data.leadId,
      userId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "pending",
      dueAt: dueDate,
    })
    .returning();

  // Also update lead's nextFollowUpAt if it's earlier or not set
  await db
    .update(leads)
    .set({ nextFollowUpAt: dueDate, updatedAt: new Date() })
    .where(and(eq(leads.id, parsed.data.leadId), eq(leads.organizationId, organizationId)));

  await ActivityService.addActivity({
    leadId: parsed.data.leadId,
    userId,
    type: "reminder_created",
    content: `Scheduled reminder: "${parsed.data.title}" for ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return reminder;
}

export async function getLeadRemindersAction(leadId: string) {
  const { organizationId } = await requireOrg();
  await assertLeadInOrg(leadId, organizationId);

  return db
    .select()
    .from(followUps)
    .where(eq(followUps.leadId, leadId))
    .orderBy(desc(followUps.dueAt));
}

export async function toggleReminderStatusAction(reminderId: string, leadId: string, status: "pending" | "completed") {
  const { userId, organizationId } = await requireOrg();
  await assertLeadInOrg(leadId, organizationId);

  const isCompleted = status === "completed";

  const [updated] = await db
    .update(followUps)
    .set({
      status,
      completedAt: isCompleted ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(followUps.id, reminderId), eq(followUps.leadId, leadId)))
    .returning();

  if (updated) {
    await ActivityService.addActivity({
      leadId,
      userId,
      type: "reminder_status",
      content: `Marked reminder "${updated.title}" as ${status}`,
    });
    revalidatePath(`/leads/${leadId}`);
  }

  return updated;
}

export async function deleteReminderAction(reminderId: string, leadId: string) {
  const { userId, organizationId } = await requireOrg();
  await assertLeadInOrg(leadId, organizationId);

  const [deleted] = await db
    .delete(followUps)
    .where(and(eq(followUps.id, reminderId), eq(followUps.leadId, leadId)))
    .returning();

  if (deleted) {
    await ActivityService.addActivity({
      leadId,
      userId,
      type: "reminder_deleted",
      content: `Deleted reminder: "${deleted.title}"`,
    });
    revalidatePath(`/leads/${leadId}`);
  }

  return deleted;
}
