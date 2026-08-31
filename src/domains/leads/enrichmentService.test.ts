import { describe, it, expect } from "vitest";
import { mergeEnrichment, needsEnrichment } from "./enrichmentService";

const result = { source: "provider.example", attributes: { company: "Acme Inc", title: "CTO" } };
const at = new Date("2026-08-31T00:00:00Z");

describe("mergeEnrichment (evidence discipline)", () => {
  it("stores the observation verbatim under _enrichment", () => {
    const out = mergeEnrichment({ company: null, customData: {} }, result, at);
    expect(out.customData._enrichment).toEqual({
      source: "provider.example",
      fetchedAt: at.toISOString(),
      attributes: { company: "Acme Inc", title: "CTO" },
    });
  });

  it("fills company only when the human left it blank", () => {
    expect(mergeEnrichment({ company: null, customData: {} }, result, at).company).toBe("Acme Inc");
    expect(mergeEnrichment({ company: "  ", customData: {} }, result, at).company).toBe("Acme Inc");
  });

  it("never overwrites a human-entered company", () => {
    expect(mergeEnrichment({ company: "Real Co", customData: {} }, result, at).company).toBe("Real Co");
  });

  it("preserves existing customData and does not mutate inputs", () => {
    const lead = { company: null, customData: { foo: 1 } };
    const out = mergeEnrichment(lead, result, at);
    expect(out.customData.foo).toBe(1);
    expect(lead.customData).toEqual({ foo: 1 }); // untouched
  });

  it("leaves company null when the provider observed none", () => {
    const out = mergeEnrichment({ company: null, customData: {} }, { source: "s", attributes: { title: "X" } }, at);
    expect(out.company).toBeNull();
  });
});

describe("needsEnrichment", () => {
  it("is true for a lead with contact data and no prior enrichment", () => {
    expect(needsEnrichment({ email: "a@b.com", company: null, customData: {} })).toBe(true);
    expect(needsEnrichment({ email: null, company: "Acme", customData: null })).toBe(true);
  });
  it("is false when already enriched", () => {
    expect(needsEnrichment({ email: "a@b.com", company: null, customData: { _enrichment: { source: "x" } } })).toBe(false);
  });
  it("is false with nothing to look up", () => {
    expect(needsEnrichment({ email: null, company: null, customData: {} })).toBe(false);
  });
});
