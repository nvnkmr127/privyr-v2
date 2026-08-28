import { describe, it, expect } from "vitest";

process.env.NEXTAUTH_SECRET = "test-secret";
const { makeState, verifyState } = await import("./google");

describe("google oauth state (CSRF binding)", () => {
  it("round-trips the user id", () => {
    const state = makeState("user-1");
    expect(verifyState(state)).toBe("user-1");
  });

  it("rejects a tampered state or wrong user", () => {
    const state = makeState("user-1");
    expect(verifyState(state.replace("user-1", "user-2"))).toBeNull();
    expect(verifyState("user-2.deadbeef")).toBeNull();
    expect(verifyState("garbage")).toBeNull();
  });
});
