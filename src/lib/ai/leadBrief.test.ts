import { describe, it, expect } from "vitest";
import { buildLeadContext, draftSystemPrompt, businessPreamble, type LeadLike } from "./leadBrief";

const baseLead: LeadLike = {
  name: "Ada Lovelace",
  status: "active",
  company: "Analytical Engines",
  email: "ada@example.com",
  phone: null,
  score: 72,
  lastContactedAt: new Date("2026-08-20T00:00:00Z"),
  nextFollowUpAt: null,
  customData: {},
};

describe("buildLeadContext", () => {
  it("includes core lead facts and the heuristic next action", () => {
    const ctx = buildLeadContext(baseLead, []);
    expect(ctx).toContain("Name: Ada Lovelace");
    expect(ctx).toContain("Company: Analytical Engines");
    expect(ctx).toContain("Engagement score: 72/100");
    expect(ctx).toContain("Recommended next action (heuristic):");
  });

  it("surfaces enrichment as observed, not fact", () => {
    const lead = { ...baseLead, customData: { _enrichment: { attributes: { title: "Countess" } } } };
    expect(buildLeadContext(lead, [])).toContain("Enriched (observed by data provider):");
  });

  it("caps recent activity at 10 entries", () => {
    const acts = Array.from({ length: 15 }, (_, i) => ({
      type: "note",
      content: `event ${i}`,
      createdAt: new Date("2026-08-01T00:00:00Z"),
    }));
    const ctx = buildLeadContext(baseLead, acts);
    expect(ctx).toContain("event 0");
    expect(ctx).not.toContain("event 10");
  });

  it("does not leak enrichment line when there is none", () => {
    expect(buildLeadContext(baseLead, [])).not.toContain("Enriched");
  });
});

describe("draftSystemPrompt", () => {
  it("is channel-specific", () => {
    expect(draftSystemPrompt("email")).toContain("email");
    expect(draftSystemPrompt("sms")).toContain("SMS");
    expect(draftSystemPrompt("whatsapp")).toContain("WhatsApp");
  });
});

describe("businessPreamble", () => {
  it("anchors to the tenant and always forbids guessing from the lead", () => {
    const s = businessPreamble({ name: "Acme Realty", industry: "Real Estate", website: "acme.com", aiContext: "We sell homes." });
    expect(s).toContain("Acme Realty");
    expect(s).toContain("Real Estate");
    expect(s).toContain("acme.com");
    expect(s).toContain("We sell homes.");
    expect(s).toContain("describes the LEAD"); // the anti-hallucination guard
  });

  it("omits missing fields without breaking the guard", () => {
    const s = businessPreamble({ name: "Solo Co", industry: null, website: null });
    expect(s).toContain("Solo Co");
    expect(s).not.toContain("business in ");
    expect(s).not.toContain("About the business:");
    expect(s).toContain("describes the LEAD");
  });
});
