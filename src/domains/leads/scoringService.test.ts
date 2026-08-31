import { describe, expect, it } from "vitest";
import { ScoringService } from "./scoringService";

describe("ScoringService", () => {
  it("should calculate score correctly for complete won lead", () => {
    const score = ScoringService.calculateScore({
      status: "won",
      phone: "+1234567890",
      email: "alex@example.com",
      company: "Acme Inc",
      lastContactedAt: new Date(),
      nextFollowUpAt: new Date(Date.now() + 86400000),
      activitiesCount: 5,
      hasInboundMsg: true,
    });
    expect(score).toBe(100);
  });

  it("should calculate score for minimal new lead", () => {
    const score = ScoringService.calculateScore({
      status: "new",
      name: "New Lead",
    } as any);
    expect(score).toBe(20);
  });

  it("should handle decayed contact recency", () => {
    const score = ScoringService.calculateScore({
      status: "active",
      phone: "+1234567890",
      lastContactedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });
    expect(score).toBe(45); // 35 (active) + 10 (phone)
  });

  it("should clamp score between 0 and 100", () => {
    const score = ScoringService.calculateScore({
      status: "unqualified",
    });
    expect(score).toBe(0);
  });

  it("breakdown factors sum to the score and explain it", () => {
    const bd = ScoringService.breakdown({
      status: "active",
      phone: "+1234567890",
      lastContactedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
    expect(bd.score).toBe(45);
    expect(bd.factors.reduce((s, f) => s + f.points, 0)).toBe(45);
    expect(bd.factors.map((f) => f.label)).toEqual(["Status: active", "Has phone"]);
  });

  it("breakdown omits zero-point factors", () => {
    const bd = ScoringService.breakdown({ status: "unqualified" });
    expect(bd.factors).toEqual([]);
  });
});
