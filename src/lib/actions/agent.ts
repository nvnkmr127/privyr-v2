"use server";

import { requireOrg } from "@/lib/rbac";
import { runLeadAgent, type AgentResult } from "@/lib/ai/agent";

// One turn of the CRM assistant. Tenant + identity come from the session (requireOrg), never the
// client — the agent's tools are bound to these server-side. History is the prior turns for context.
export async function runAgentAction(
  message: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  currentLeadId?: string,
): Promise<AgentResult> {
  const { organizationId, userId } = await requireOrg();
  const trimmed = message.trim();
  if (!trimmed) return { text: "Ask me something about your leads.", proposals: [], steps: 0, enabled: true };
  // Only accept a well-formed uuid as lead context; anything else is ignored (org scope guards it too).
  const leadId = typeof currentLeadId === "string" && /^[0-9a-f-]{36}$/i.test(currentLeadId) ? currentLeadId : undefined;
  // Cap history to keep prompt size (and cost) bounded.
  return runLeadAgent({ organizationId, userId }, trimmed, history.slice(-10), leadId);
}
