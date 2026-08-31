import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// AI is optional infrastructure, like the mailer: real generation needs ANTHROPIC_API_KEY,
// otherwise callers fall back gracefully. Never throws into the caller for a missing key.
export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!aiEnabled()) return null;
  client ??= new Anthropic();
  return client;
}

/**
 * Generates text from a system + user prompt. Returns null when AI is unavailable
 * (no key) or on error, so callers can fall back rather than break the flow.
 */
export async function generateText(system: string, prompt: string, maxTokens = 1000): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.messages.create({
      // Platform-level (super-admin) config; defaults to the latest Opus when unset.
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (e) {
    console.error("[ai] generateText failed", e);
    return null;
  }
}
