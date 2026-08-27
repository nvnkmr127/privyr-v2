import { Suspense } from "react";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { LeadsBySourceChart, LeadsByStageChart, LeadsByOwnerChart } from "@/components/dashboard/Charts";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { requireOrg } from "@/lib/rbac";
import { AnalyticsService, AnalyticsFilters } from "@/lib/analytics/service";

export default async function ExecutiveDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { organizationId } = await requireOrg();
  const params = await searchParams;

  const filters: AnalyticsFilters = {
    organizationId,
    ownerId: typeof params.ownerId === "string" ? params.ownerId : undefined,
    teamId: typeof params.teamId === "string" ? params.teamId : undefined,
    dateRange: (typeof params.range === "string" ? params.range : "all") as any,
  };

  const [leadsBySource, pipelineDistribution, leadsByOwner, recentActivity] = await Promise.all([
    AnalyticsService.getLeadsBySource(filters),
    AnalyticsService.getPipelineDistribution(filters),
    AnalyticsService.getLeadsByOwner(filters),
    AnalyticsService.getRecentActivity(filters),
  ]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
          <p className="text-sm text-slate-500">Real-time performance analytics for your lead management pipeline.</p>
        </div>
        <DashboardDateFilter />
      </div>

      <div className="space-y-6">
        <Suspense fallback={<div className="h-32 bg-slate-100 rounded-xl animate-pulse" />}>
          <MetricsCards filters={filters} />
        </Suspense>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 border rounded-xl p-6 bg-white flex flex-col min-h-[350px]">
            <h3 className="text-lg font-medium mb-1">Leads by Source</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution of incoming lead volume across channels.</p>
            <LeadsBySourceChart data={leadsBySource} />
          </div>

          <div className="col-span-3 border rounded-xl p-6 bg-white flex flex-col min-h-[350px]">
            <h3 className="text-lg font-medium mb-1">Pipeline Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">Leads broken down by current stage.</p>
            <LeadsByStageChart data={pipelineDistribution} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 border rounded-xl p-6 bg-white flex flex-col min-h-[350px]">
            <h3 className="text-lg font-medium mb-1">Lead Distribution by Owner</h3>
            <p className="text-xs text-slate-500 mb-4">Lead count assigned per team member.</p>
            <LeadsByOwnerChart data={leadsByOwner} />
          </div>

          <div className="col-span-3 border rounded-xl p-6 bg-white flex flex-col min-h-[350px]">
            <h3 className="text-lg font-medium mb-1">Recent Activity</h3>
            <p className="text-xs text-slate-500 mb-4">Live timeline of actions across all leads.</p>
            <RecentActivityFeed activities={recentActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
