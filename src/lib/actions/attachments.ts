"use server";

import { db } from "@/db";
import { leadAttachments } from "@/db/schema/activities";
import { requireOrg } from "@/lib/rbac";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ActivityService } from "@/domains/activities/service";
import { z } from "zod";

const addAttachmentSchema = z.object({
  leadId: z.string().uuid(),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Valid URL or file path is required"),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
});

export async function addAttachmentAction(input: z.infer<typeof addAttachmentSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = addAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid attachment data");
  }

  const [attachment] = await db
    .insert(leadAttachments)
    .values({
      leadId: parsed.data.leadId,
      organizationId,
      fileName: parsed.data.fileName,
      fileUrl: parsed.data.fileUrl,
      fileSize: parsed.data.fileSize,
      fileType: parsed.data.fileType,
      uploadedById: userId,
    })
    .returning();

  await ActivityService.addActivity({
    leadId: parsed.data.leadId,
    userId,
    type: "attachment",
    content: `Attached file: ${parsed.data.fileName}`,
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return attachment;
}

export async function getAttachmentsAction(leadId: string) {
  await requireOrg();
  return db
    .select()
    .from(leadAttachments)
    .where(eq(leadAttachments.leadId, leadId))
    .orderBy(desc(leadAttachments.createdAt));
}

export async function deleteAttachmentAction(attachmentId: string, leadId: string) {
  const { userId } = await requireOrg();

  const [deleted] = await db
    .delete(leadAttachments)
    .where(and(eq(leadAttachments.id, attachmentId), eq(leadAttachments.leadId, leadId)))
    .returning();

  if (deleted) {
    await ActivityService.addActivity({
      leadId,
      userId,
      type: "attachment_deleted",
      content: `Removed attachment: ${deleted.fileName}`,
    });
    revalidatePath(`/leads/${leadId}`);
  }

  return deleted;
}
