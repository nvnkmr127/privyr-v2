"use server";

import { requireAuth } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ActivityService } from "@/domains/activities/service";

export async function listTemplates(channel?: string) {
  await requireAuth();
  const rows = await db.select().from(messageTemplates).orderBy(desc(messageTemplates.createdAt));
  return channel ? rows.filter((t) => t.channel === channel) : rows;
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  channel: z.enum(["whatsapp", "sms", "email"]),
  subject: z.string().max(255).optional(),
  body: z.string().min(1),
});

export async function createTemplateAction(input: z.infer<typeof createSchema>) {
  await requireAuth();
  const data = createSchema.parse(input);
  const [row] = await db.insert(messageTemplates).values(data).returning();
  revalidatePath("/templates");
  return row;
}

export async function deleteTemplateAction(id: string) {
  await requireAuth();
  await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
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
