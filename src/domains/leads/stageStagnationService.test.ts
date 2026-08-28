import { describe, expect, it, vi } from "vitest";
import { StageStagnationService } from "./stageStagnationService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() =>
          Promise.resolve([
            {
              id: "lead-stagnant-1",
              name: "Stuck Lead",
              phone: "123456",
              email: "stuck@example.com",
              status: "active",
              stageId: "stage-1",
              ownerId: "user-1",
              updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago => high risk
            },
          ])
        ),
      })),
    })),
  },
}));

vi.mock("@/domains/activities/service", () => ({
  ActivityService: {
    addActivity: vi.fn().mockResolvedValue({ id: "act-stagnant" }),
  },
}));

describe("StageStagnationService", () => {
  it("should detect stagnant leads and assign high risk level", async () => {
    const stagnant = await StageStagnationService.getStagnantLeads("org-1", 10);

    expect(stagnant.length).toBe(1);
    expect(stagnant[0].id).toBe("lead-stagnant-1");
    expect(stagnant[0].daysStagnant).toBe(15);
    expect(stagnant[0].riskLevel).toBe("high");
  });

  it("should flag stagnant leads and log activity alerts", async () => {
    const result = await StageStagnationService.flagStagnantLeads("org-1", 10, "user-1");

    expect(result.flaggedCount).toBe(1);
    expect(result.leadIds).toEqual(["lead-stagnant-1"]);
  });
});
