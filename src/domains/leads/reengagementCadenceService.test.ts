import { describe, expect, it, vi } from "vitest";
import { ReengagementCadenceService } from "./reengagementCadenceService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: "lead-cold-1",
              name: "Jane Doe",
              lastContactedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
              createdAt: new Date(),
            },
          ]),
        })),
      })),
    })),
  },
}));

describe("ReengagementCadenceService", () => {
  it("should generate a 4-step multi-channel re-engagement drip cadence", async () => {
    const cadence = await ReengagementCadenceService.getLeadReengagementCadence("lead-cold-1", "org-1");

    expect(cadence.leadId).toBe("lead-cold-1");
    expect(cadence.daysInactive).toBe(15);
    expect(cadence.recommendedCadence.length).toBe(4);

    expect(cadence.recommendedCadence[0].channel).toBe("whatsapp");
    expect(cadence.recommendedCadence[0].dayOffset).toBe(1);

    expect(cadence.recommendedCadence[1].channel).toBe("call");
    expect(cadence.recommendedCadence[1].dayOffset).toBe(3);

    expect(cadence.recommendedCadence[2].channel).toBe("email");
    expect(cadence.recommendedCadence[2].dayOffset).toBe(7);

    expect(cadence.recommendedCadence[3].channel).toBe("offer");
    expect(cadence.recommendedCadence[3].dayOffset).toBe(14);
  });
});
