"use server";

import { z } from "zod";
import { requireOrg } from "@/lib/rbac";
import { LeadService } from "@/domains/leads/service";
import { ActivityService } from "@/domains/activities/service";
import { generateText, aiEnabled } from "@/lib/ai/client";
import { buildLeadContext } from "@/lib/ai/leadBrief";

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
  // Ground the draft in the same evidence the recap uses: lead facts, enrichment, and the
  // heuristic next-best-action — so an enriched lead gets a sharper, more specific message.
  const prompt = `${buildLeadContext(lead, activities)}\n\nWrite the next WhatsApp message to send this lead.`;

  const draft = await generateText(SYSTEM, prompt);
  if (!draft) {
    return {
      draft: `Hi ${firstName}, just following up — any questions I can help with?`,
      ai: false,
    };
  }
  return { draft, ai: true };
}

const RECAP_SYSTEM = `You summarize a sales lead's history for a busy salesperson.
Return ONE or TWO short sentences: where this lead stands and the single most useful next step.
No preamble, no bullet points, no quotes. Plain, specific, factual.`;

// AI conversation recap — a one-glance "where this lead stands" for the lead header.
export async function summarizeLeadAction(data: unknown): Promise<{ summary: string; ai: boolean }> {
  const { organizationId } = await requireOrg();
  const { leadId } = schema.parse(data);
  const lead = await LeadService.getLead(leadId, organizationId);
  if (!lead) throw new Error("Lead not found");

  const activities = await ActivityService.getLeadActivities(leadId);
  if (!aiEnabled() || activities.length === 0) {
    const last = activities[0];
    return {
      summary: last
        ? `Last touch: ${last.type}${last.content ? ` — ${last.content}` : ""}. Status is ${lead.status}.`
        : `New ${lead.status} lead with no activity yet — reach out to make first contact.`,
      ai: false,
    };
  }

  const summary = await generateText(RECAP_SYSTEM, buildLeadContext(lead, activities), 200);
  return summary ? { summary, ai: true } : { summary: `Status is ${lead.status}. Review recent activity and follow up.`, ai: false };
}

const SEQ_SYSTEM = `You design short WhatsApp/email follow-up sequences for salespeople.
Return ONLY a JSON array (no prose) of 3-5 steps. Each step:
{"dayOffset": <int days from enrolment>, "channel": "whatsapp"|"email", "body": "<message under 60 words>"}
Start dayOffset at 0 (first message) and increase. Warm, human, specific, one clear next step each.`;

export type GeneratedSequenceStep = { dayOffset: number; channel: "whatsapp" | "email"; body: string };

// AI sequence generator — turns a plain-English goal into ready-to-edit sequence steps.
export async function generateSequenceAction(goal: string): Promise<{ steps: GeneratedSequenceStep[]; ai: boolean }> {
  await requireOrg();
  const clean = String(goal || "").slice(0, 500).trim();
  const fallback: GeneratedSequenceStep[] = [
    { dayOffset: 0, channel: "whatsapp", body: "Hi {{first_name}}, thanks for your interest! Happy to answer any questions — when's a good time for a quick chat?" },
    { dayOffset: 2, channel: "whatsapp", body: "Hi {{first_name}}, just checking in — did you get a chance to look things over? I'm here if anything's unclear." },
    { dayOffset: 5, channel: "email", body: "Hi {{first_name}}, following up once more. If now isn't the right time, just let me know and I'll circle back later. Otherwise, happy to set up a call." },
  ];
  if (!aiEnabled() || !clean) return { steps: fallback, ai: false };

  const raw = await generateText(SEQ_SYSTEM, `Goal: ${clean}\nAudience: sales leads.`, 800);
  if (!raw) return { steps: fallback, ai: false };
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
    const steps: GeneratedSequenceStep[] = (Array.isArray(parsed) ? parsed : [])
      .map((s: any): GeneratedSequenceStep => ({
        dayOffset: Math.max(0, Math.floor(Number(s.dayOffset) || 0)),
        channel: s.channel === "email" ? "email" : "whatsapp",
        body: String(s.body || "").slice(0, 500),
      }))
      .filter((s) => s.body.length > 0);
    return steps.length ? { steps, ai: true } : { steps: fallback, ai: false };
  } catch {
    return { steps: fallback, ai: false };
  }
}
