import { describe, expect, it, vi } from "vitest";
import { processScoreDecayJob } from "./scoreDecayWorker";
import { ScoringService } from "@/domains/leads/scoringService";

describe("Score Decay Worker", () => {
  it("should process score recalculation for a single lead", async () => {
    vi.spyOn(ScoringService, "updateLeadScore").mockResolvedValue(65);

    const mockJob: any = {
      id: "job-1",
      data: { leadId: "lead-100" },
    };

    const result = await processScoreDecayJob(mockJob);

    expect(ScoringService.updateLeadScore).toHaveBeenCalledWith("lead-100");
    expect(result).toEqual({ leadId: "lead-100", score: 65 });
  });

  it("should process organization-wide score decay when leadId is absent", async () => {
    vi.spyOn(ScoringService, "recalculateAllScores").mockResolvedValue(42);

    const mockJob: any = {
      id: "job-2",
      data: { organizationId: "org-xyz" },
    };

    const result = await processScoreDecayJob(mockJob);

    expect(ScoringService.recalculateAllScores).toHaveBeenCalledWith("org-xyz");
    // The org-wide pass also prunes automation_runs; assert the score result, ignore prune count.
    expect(result).toMatchObject({ processed: 42 });
  });
});
