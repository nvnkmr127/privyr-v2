"use server";

import { z } from "zod";
import { requireOrg } from "@/lib/rbac";
import { LeadService } from "@/domains/leads/service";
import { ActivityService } from "@/domains/activities/service";
import { generateText, aiEnabled } from "@/lib/ai/client";
import { buildLeadContext, businessPreamble } from "@/lib/ai/leadBrief";
import { OrgService } from "@/domains/organizations/service";

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
  const org = await OrgService.getOrganization(organizationId);
  // Ground the draft in the same evidence the recap uses: lead facts, enrichment, and the
  // heuristic next-best-action — so an enriched lead gets a sharper, more specific message.
  const prompt = `${buildLeadContext(lead, activities)}\n\nWrite the next WhatsApp message to send this lead.`;

  const draft = await generateText(`${businessPreamble(org)}\n\n${SYSTEM}`, prompt);
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

  const org = await OrgService.getOrganization(organizationId);
  const summary = await generateText(`${businessPreamble(org)}\n\n${RECAP_SYSTEM}`, buildLeadContext(lead, activities), 200);
  return summary ? { summary, ai: true } : { summary: `Status is ${lead.status}. Review recent activity and follow up.`, ai: false };
}

const SEQ_SYSTEM = `You design short WhatsApp/email follow-up sequences for salespeople.
Return ONLY a JSON array (no prose) of 3-5 steps. Each step:
{"dayOffset": <int days from enrolment>, "channel": "whatsapp"|"email", "body": "<message under 60 words>"}
Start dayOffset at 0 (first message) and increase. Warm, human, specific, one clear next step each.`;

export type GeneratedSequenceStep = { dayOffset: number; channel: "whatsapp" | "email"; body: string };

function buildContextualSequence(goal: string): GeneratedSequenceStep[] {
  const g = goal.toLowerCase();

  if (g.includes("demo") || g.includes("trial") || g.includes("software") || g.includes("product") || g.includes("app")) {
    return [
      { dayOffset: 0, channel: "whatsapp", body: "Hi {{first_name}}, thanks for checking us out! I'd love to walk you through a quick 10-minute demo to show how we can help. How does your schedule look this week?" },
      { dayOffset: 2, channel: "whatsapp", body: "Hi {{first_name}}, following up on the demo. Are there any specific features or questions you'd like us to focus on?" },
      { dayOffset: 5, channel: "email", body: "Hi {{first_name}},\n\nWanted to share a quick walkthrough video and summary of key capabilities. Feel free to pick a time on my calendar whenever you're ready: [Calendar Link]\n\nBest regards," },
      { dayOffset: 8, channel: "whatsapp", body: "Hi {{first_name}}, just checking in one last time. If you're still exploring options, let me know if I can help answer anything!" },
    ];
  }

  if (g.includes("call") || g.includes("meeting") || g.includes("consult") || g.includes("appointment") || g.includes("book")) {
    return [
      { dayOffset: 0, channel: "whatsapp", body: "Hi {{first_name}}, thanks for reaching out! I'd love to set up a short call to discuss your needs. Are you free tomorrow morning or afternoon?" },
      { dayOffset: 2, channel: "whatsapp", body: "Hi {{first_name}}, just checking if you had a chance to look over your availability for a quick call? Happy to work around your calendar." },
      { dayOffset: 5, channel: "email", body: "Hi {{first_name}},\n\nFollowing up on scheduling a time to speak. You can select a slot directly here: [Schedule Link]. Looking forward to connecting!\n\nBest regards," },
    ];
  }

  if (g.includes("quote") || g.includes("price") || g.includes("cost") || g.includes("proposal") || g.includes("estimate") || g.includes("pricing")) {
    return [
      { dayOffset: 0, channel: "whatsapp", body: "Hi {{first_name}}, thanks for requesting pricing details! I'm preparing a customized estimate for you. Are there any specific requirements or timelines to factor in?" },
      { dayOffset: 2, channel: "whatsapp", body: "Hi {{first_name}}, following up on your quotation. Did you get a chance to review the numbers, or would you like to discuss any adjustments?" },
      { dayOffset: 5, channel: "email", body: "Hi {{first_name}},\n\nChecking in on the proposal we shared. We can tailor the package to meet your exact budget. Let me know if you'd like to jump on a quick call to go over it.\n\nBest regards," },
    ];
  }

  if (g.includes("real estate") || g.includes("property") || g.includes("home") || g.includes("site visit") || g.includes("tour") || g.includes("flat") || g.includes("villa")) {
    return [
      { dayOffset: 0, channel: "whatsapp", body: "Hi {{first_name}}, thanks for your interest in our property! When would be a good day for an exclusive site visit or video walkthrough?" },
      { dayOffset: 2, channel: "whatsapp", body: "Hi {{first_name}}, sharing the brochure and floor plans with you. Would this weekend work for an in-person viewing?" },
      { dayOffset: 5, channel: "whatsapp", body: "Hi {{first_name}}, we have a few viewing slots open this Saturday. Let me know if you'd like me to reserve a spot for you!" },
    ];
  }

  const topic = goal
    .replace(/^(nurture|follow up|reach out|sell|send|help|close|convert|onboard|target)\s+/i, "")
    .trim() || "your inquiry";

  return [
    { dayOffset: 0, channel: "whatsapp", body: `Hi {{first_name}}, thanks for connecting with us regarding ${topic}! I'm here to answer any questions and guide you through the next steps.` },
    { dayOffset: 2, channel: "whatsapp", body: `Hi {{first_name}}, following up regarding ${topic}. Did you have a chance to look things over? Happy to jump on a quick chat whenever suits you.` },
    { dayOffset: 5, channel: "email", body: `Hi {{first_name}},\n\nWanted to circle back on ${topic}. Let me know if you have any questions or if you'd like to schedule a 10-minute call this week.\n\nBest regards,` },
    { dayOffset: 8, channel: "whatsapp", body: `Hi {{first_name}}, just checking in one final time regarding ${topic}. I'm here whenever you're ready to move forward!` },
  ];
}

// AI sequence generator — turns a plain-English goal into ready-to-edit sequence steps.
export async function generateSequenceAction(goal: string): Promise<{ steps: GeneratedSequenceStep[]; ai: boolean }> {
  await requireOrg();
  const clean = String(goal || "").slice(0, 500).trim();
  const contextual = buildContextualSequence(clean);

  if (!clean || !aiEnabled()) {
    return { steps: contextual, ai: false };
  }

  try {
    const { organizationId } = await requireOrg();
    const org = await OrgService.getOrganization(organizationId);
    const raw = await generateText(`${businessPreamble(org)}\n\n${SEQ_SYSTEM}`, `Goal: ${clean}\nAudience: sales leads.`, 800);
    if (!raw) return { steps: contextual, ai: false };

    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) return { steps: contextual, ai: false };

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    const steps: GeneratedSequenceStep[] = (Array.isArray(parsed) ? parsed : [])
      .map((s: any): GeneratedSequenceStep => ({
        dayOffset: Math.max(0, Math.floor(Number(s.dayOffset) || 0)),
        channel: s.channel === "email" ? "email" : "whatsapp",
        body: String(s.body || "").slice(0, 500),
      }))
      .filter((s) => s.body.length > 0);
    return steps.length ? { steps, ai: true } : { steps: contextual, ai: false };
  } catch {
    return { steps: contextual, ai: false };
  }
}
