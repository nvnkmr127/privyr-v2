"use server";

import { z } from "zod";
import { requireOrg } from "@/lib/rbac";
import { LeadService } from "@/domains/leads/service";
import { ActivityService } from "@/domains/activities/service";
import { generateText, aiEnabled } from "@/lib/ai/client";

const schema = z.object({ leadId: z.string().uuid() });

const SYSTEM = `You are helping a salesperson write a short, warm, professional WhatsApp message to a lead.
Rules: keep it under 60 words, sound human and specific (not salesy), no emojis unless natural, one clear next step.
Return ONLY the message text — no preamble, no quotes.`;

export async function draftLeadReplyAction(data: unknown): Promise<{ draft: string; ai: boolean }> {
  const { organizationId } = await requireOrg();
  const { leadId } = schema.parse(data);

  const lead = await LeadService.getLead(leadId, organizationId);
  if (!lead) throw new Error("Lead not found");

  const firstName = (lead.name ?? "there").split(" ")[0];

  // Graceful fallback when AI isn't configured — still useful, just not generated.
  if (!aiEnabled()) {
    return {
      draft: `Hi ${firstName}, just following up — do you have any questions I can help with? Happy to jump on a quick call whenever suits you.`,
      ai: false,
    };
  }

  const activities = await ActivityService.getLeadActivities(leadId);
  const recent = activities
    .slice(0, 8)
    .map((a) => `- ${a.type}${a.content ? `: ${a.content}` : ""}`)
    .join("\n");

  const prompt = [
    `Lead: ${lead.name ?? "Unknown"}`,
    `Status: ${lead.status}`,
    lead.company ? `Company: ${lead.company}` : null,
    recent ? `Recent activity (newest first):\n${recent}` : "No recorded activity yet.",
    `\nWrite the next WhatsApp message to send this lead.`,
  ]
    .filter(Boolean)
    .join("\n");

  const draft = await generateText(SYSTEM, prompt);
  if (!draft) {
    return {
      draft: `Hi ${firstName}, just following up — any questions I can help with?`,
      ai: false,
    };
  }
  return { draft, ai: true };
}
