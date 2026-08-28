"use server";

import { requireAuth, requireOrg, requirePermission } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { ActivityService } from "@/domains/activities/service";

export async function listTemplates(channel?: string) {
  const { organizationId } = await requireOrg();
  const rows = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.organizationId, organizationId))
    .orderBy(desc(messageTemplates.createdAt));
  return channel ? rows.filter((t) => t.channel === channel) : rows;
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  channel: z.enum(["whatsapp", "sms", "email"]),
  subject: z.string().max(255).optional(),
  body: z.string().min(1),
});

export async function createTemplateAction(input: z.infer<typeof createSchema>) {
  const { organizationId } = await requirePermission("templates.manage");
  const data = createSchema.parse(input);
  const [row] = await db.insert(messageTemplates).values({ ...data, organizationId }).returning();
  revalidatePath("/templates");
  return row;
}

export async function deleteTemplateAction(id: string) {
  const { organizationId } = await requirePermission("templates.manage");
  await db
    .delete(messageTemplates)
    .where(and(eq(messageTemplates.id, id), eq(messageTemplates.organizationId, organizationId)));
  revalidatePath("/templates");
}

// Send a WhatsApp message via Watxio (server-side send, not a deep link).
// Free-form `body` works only inside the 24h window; otherwise pass a `templateName`.
export async function sendWhatsAppAction(input: {
  leadId: string;
  body?: string;
  templateName?: string;
  variables?: string[];
}) {
  const session = await requireAuth();
  const { WhatsAppService } = await import("@/lib/messaging/whatsapp/service");
  const result = await WhatsAppService.send({ ...input, userId: session.user.id });
  revalidatePath(`/leads/${input.leadId}`);
  return result;
}

// Send an email to a lead and log it on the timeline. Uses the shared mailer (dev-safe).
const emailSchema = z.object({
  leadId: z.string().uuid(),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
});

export async function sendEmailAction(input: z.infer<typeof emailSchema>) {
  const { userId, organizationId } = await requireOrg();
  const data = emailSchema.parse(input);

  const { LeadService } = await import("@/domains/leads/service");
  const lead = await LeadService.getLead(data.leadId, organizationId);
  if (!lead) throw new Error("Lead not found");
  if (!lead.email) throw new Error("This lead has no email address");

  const { sendEmail } = await import("@/lib/mail/mailer");
  await sendEmail({ to: lead.email, subject: data.subject, html: `<p>${data.body.replace(/\n/g, "<br/>")}</p>` });

  await ActivityService.addActivity({
    leadId: data.leadId,
    userId,
    type: "email",
    content: `[email] ${data.subject}`,
  });
  revalidatePath(`/leads/${data.leadId}`);
  return { ok: true };
}

// Log that a message was sent so it lands on the lead's activity timeline.
export async function logMessageAction(input: { leadId: string; channel: string; text: string }) {
  const session = await requireAuth();
  await ActivityService.addActivity({
    leadId: input.leadId,
    userId: session.user.id,
    type: "message",
    content: `[${input.channel}] ${input.text}`,
  });
  revalidatePath(`/leads/${input.leadId}`);
}
