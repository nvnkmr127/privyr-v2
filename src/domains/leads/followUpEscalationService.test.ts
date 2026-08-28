import { describe, expect, it, vi } from "vitest";
import { FollowUpEscalationService } from "./followUpEscalationService";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockImplementation(() =>
            Promise.resolve([
              {
                id: "fup-overdue-1",
                leadId: "lead-1",
                dueAt: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago => critical
                description: "Call back regarding quote",
                userId: "user-1",
                leadName: "John Doe",
                leadPhone: "123456",
                leadEmail: "john@example.com",
                leadOwnerId: "user-1",
              },
            ])
          ),
        })),
      })),
    })),
  },
}));

vi.mock("@/domains/activities/service", () => ({
  ActivityService: {
    addActivity: vi.fn().mockResolvedValue({ id: "act-escalate" }),
  },
}));

describe("FollowUpEscalationService", () => {
  it("should detect overdue follow-ups and assign critical severity", async () => {
    const overdue = await FollowUpEscalationService.getOverdueFollowUps("org-1");

    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe("fup-overdue-1");
    expect(overdue[0].severity).toBe("critical");
    expect(overdue[0].hoursOverdue).toBeGreaterThanOrEqual(49);
  });

  it("should escalate overdue follow-ups and add urgency activity alerts", async () => {
    const result = await FollowUpEscalationService.escalateOverdueFollowUps("org-1", "user-1");

    expect(result.escalatedCount).toBe(1);
    expect(result.criticalCount).toBe(1);
  });
});
