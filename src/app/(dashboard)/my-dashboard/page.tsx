import { Suspense } from "react";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { requireOrg } from "@/lib/rbac";

export default async function SalesRepDashboardPage() {
  const { userId, organizationId } = await requireOrg();

  // Force the ownerId filter to be the current user
  const filters = {
    organizationId,
    ownerId: userId,
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Sales Dashboard</h2>
      </div>
      
      <div className="space-y-4">
        <Suspense fallback={<div>Loading my metrics...</div>}>
          <MetricsCards filters={filters} />
        </Suspense>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border rounded-xl p-6 bg-muted flex items-center justify-center min-h-[300px]">
             <p className="text-muted-foreground">My Pipeline by Stage (Chart)</p>
          </div>
          <div className="border rounded-xl p-6 bg-muted flex items-center justify-center min-h-[300px]">
             <p className="text-muted-foreground">My Follow-ups Activity (Chart)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
