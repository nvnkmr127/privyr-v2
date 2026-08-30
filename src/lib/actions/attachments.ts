"use server";

import { db } from "@/db";
import { leadAttachments } from "@/db/schema/activities";
import { requireOrg } from "@/lib/rbac";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ActivityService } from "@/domains/activities/service";
import { assertLeadInOrg } from "@/domains/leads/ownership";
import { z } from "zod";
import { ok, fail, actionFail, zodFieldErrors } from "@/lib/actions/result";

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
    return fail("VALIDATION", "Please provide a valid file name and URL.", zodFieldErrors(parsed.error));
  }

  try {
    await assertLeadInOrg(parsed.data.leadId, organizationId);

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
    return ok(attachment);
  } catch (e) {
    return actionFail(e);
  }
}

export async function getAttachmentsAction(leadId: string) {
  const { organizationId } = await requireOrg();
  await assertLeadInOrg(leadId, organizationId);

  return db
    .select()
    .from(leadAttachments)
    .where(and(eq(leadAttachments.leadId, leadId), eq(leadAttachments.organizationId, organizationId)))
    .orderBy(desc(leadAttachments.createdAt));
}

export async function deleteAttachmentAction(attachmentId: string, leadId: string) {
  const { userId, organizationId } = await requireOrg();
  try {
    await assertLeadInOrg(leadId, organizationId);

    const [deleted] = await db
      .delete(leadAttachments)
      .where(
        and(
          eq(leadAttachments.id, attachmentId),
          eq(leadAttachments.leadId, leadId),
          eq(leadAttachments.organizationId, organizationId)
        )
      )
      .returning();

    if (!deleted) return fail("NOT_FOUND", "This attachment was already removed.");

    await ActivityService.addActivity({
      leadId,
      userId,
      type: "attachment_deleted",
      content: `Removed attachment: ${deleted.fileName}`,
    });
    revalidatePath(`/leads/${leadId}`);
    return ok(deleted);
  } catch (e) {
    return actionFail(e);
  }
}
