import { NextBestActionService } from "@/domains/leads/nextBestActionService";

// Pure prompt-context assembly for the AI assist actions. Kept out of the "use server" file so it
// can be unit-tested and reused. It composes ONLY facts the CRM already holds — the model is told
// (in the action's system prompt) never to invent anything beyond this block. Enrichment data is
// labelled as observed, so a draft can lean on it without treating a guess as fact.

export interface LeadLike {
  name: string;
  status: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  score: number | null;
  lastContactedAt: Date | null;
  nextFollowUpAt: Date | null;
  customData: unknown;
}

export interface ActivityLike {
  type: string;
  content: string | null;
  createdAt: Date | null;
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "never";
}

/** Compact, factual context block fed to the model. Only CRM-known data goes in. */
export function buildLeadContext(lead: LeadLike, activities: ActivityLike[]): string {
  const nba = NextBestActionService.getRecommendation({
    status: lead.status,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    score: lead.score ?? undefined,
    phone: lead.phone,
    email: lead.email,
  });

  const enrichment = (lead.customData as { _enrichment?: { attributes?: Record<string, unknown> } } | null)
    ?._enrichment?.attributes;

  const lines: string[] = [
    `Name: ${lead.name}`,
    `Company: ${lead.company ?? "unknown"}`,
    `Status: ${lead.status}`,
    `Engagement score: ${lead.score ?? 0}/100`,
    `Email: ${lead.email ?? "none"}`,
    `Phone: ${lead.phone ?? "none"}`,
    `Last contacted: ${fmtDate(lead.lastContactedAt)}`,
    `Next follow-up: ${fmtDate(lead.nextFollowUpAt)}`,
    `Recommended next action (heuristic): ${nba.label} — ${nba.reason}`,
  ];

  if (enrichment && Object.keys(enrichment).length > 0) {
    lines.push(`Enriched (observed by data provider): ${JSON.stringify(enrichment)}`);
  }

  if (activities.length > 0) {
    lines.push("Recent activity (newest first):");
    for (const a of activities.slice(0, 10)) {
      lines.push(`- [${fmtDate(a.createdAt)}] ${a.type}: ${a.content ?? ""}`.trim());
    }
  }

  return lines.join("\n");
}

export const SYSTEM_SUMMARY =
  "You are a concise sales assistant inside a lead CRM. Summarise the lead in 2-3 sentences and " +
  "state the single best next step. Use ONLY the facts in the context. Never invent details about " +
  "the person or company; if something is unknown, do not guess. No preamble.";

export function draftSystemPrompt(channel: "whatsapp" | "sms" | "email"): string {
  const len =
    channel === "email"
      ? "a short email (subject line, then body)"
      : channel === "sms"
        ? "an SMS under 320 characters"
        : "a friendly WhatsApp message under 400 characters";
  return (
    `You are a sales rep drafting ${len} to this lead. Warm, specific, one clear ask. ` +
    "Use ONLY the facts in the context — never invent details. Address them by first name. " +
    "Output only the message, ready to send."
  );
}
