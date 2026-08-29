import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { AnalyticsService, AnalyticsFilters } from "@/lib/analytics/service";

// Org-wide dashboard: headline metrics + follow-up counts + pipeline breakdown.
export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;

  const filters: AnalyticsFilters = { organizationId: auth.organizationId };
  const [leadMetrics, followUpMetrics, pipeline] = await Promise.all([
    AnalyticsService.getLeadMetrics(filters),
    AnalyticsService.getFollowUpMetrics(filters),
    AnalyticsService.getPipelineDistribution(filters),
  ]);

  return NextResponse.json({ data: { leadMetrics, followUpMetrics, pipeline } });
}
