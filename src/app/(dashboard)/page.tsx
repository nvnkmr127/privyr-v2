import { Suspense } from "react";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { RevenueChart, LeadsByStageChart } from "@/components/dashboard/Charts";
import { requireAuth } from "@/lib/rbac";

export default async function ExecutiveDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireAuth();

  // Parse filters from URL
  const filters = {
    ownerId: searchParams.ownerId as string | undefined,
    teamId: searchParams.teamId as string | undefined,
    // Add date parsing logic if needed
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
      </div>
      
      <div className="space-y-4">
        {/* We can add DashboardFilters component here later to mutate URL search params */}
        
        <Suspense fallback={<div>Loading metrics...</div>}>
          <MetricsCards filters={filters} />
        </Suspense>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 border rounded-xl p-6 bg-white flex flex-col min-h-[300px]">
             <h3 className="text-lg font-medium mb-4">Revenue by Source</h3>
             <RevenueChart data={[
               { name: "Website", total: 15000 },
               { name: "Referral", total: 12000 },
               { name: "Ads", total: 8500 },
               { name: "Organic", total: 5000 },
             ]} />
          </div>
          <div className="col-span-3 border rounded-xl p-6 bg-white flex flex-col min-h-[300px]">
             <h3 className="text-lg font-medium mb-4">Pipeline Distribution</h3>
             <LeadsByStageChart data={[
               { name: "New", count: 45 },
               { name: "Contacted", count: 32 },
               { name: "Qualified", count: 20 },
               { name: "Proposal", count: 12 },
               { name: "Won", count: 8 },
             ]} />
          </div>
        </div>
      </div>
    </div>
  );
}
