import { describe, it, expect } from "vitest";
import { extractEmail, formatInbound } from "./emailInboundService";

describe("extractEmail", () => {
  it("pulls the address from a display-name From header", () => {
    expect(extractEmail("Ada Lovelace <ADA@Example.com>")).toBe("ada@example.com");
  });
  it("accepts a bare address", () => {
    expect(extractEmail("bob@test.io")).toBe("bob@test.io");
  });
  it("rejects garbage", () => {
    expect(extractEmail("not-an-email")).toBeNull();
    expect(extractEmail("")).toBeNull();
  });
});

describe("formatInbound", () => {
  it("labels the direction and includes subject + body", () => {
    expect(formatInbound("Re: pricing", "Sounds good")).toBe("[email ← lead] Re: pricing: Sounds good");
  });
  it("handles an empty subject", () => {
    expect(formatInbound("", "hi")).toBe("[email ← lead] (no subject): hi");
  });
  it("truncates a very long body", () => {
    const out = formatInbound("s", "x".repeat(5000));
    expect(out.length).toBeLessThan(2100);
  });
});
