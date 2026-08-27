import { describe, it, expect } from "vitest";
import { nextRoundRobinIndex } from "./assignmentService";

const users = ["a", "b", "c"];

describe("nextRoundRobinIndex", () => {
  it("starts at 0 when no one has been assigned yet", () => {
    expect(nextRoundRobinIndex(users, null)).toBe(0);
  });

  it("advances to the next user", () => {
    expect(nextRoundRobinIndex(users, "a")).toBe(1);
    expect(nextRoundRobinIndex(users, "b")).toBe(2);
  });

  it("wraps around after the last user", () => {
    expect(nextRoundRobinIndex(users, "c")).toBe(0);
  });

  it("restarts at 0 when the last assignee left the team", () => {
    expect(nextRoundRobinIndex(users, "gone")).toBe(0);
  });

  it("returns -1 when there are no team members", () => {
    expect(nextRoundRobinIndex([], "a")).toBe(-1);
  });
});
