import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsService, AnalyticsFilters } from "@/lib/analytics/service";

export async function MetricsCards({ filters }: { filters?: AnalyticsFilters }) {
  const metrics = await AnalyticsService.getLeadMetrics(filters);
  const followUpMetrics = await AnalyticsService.getFollowUpMetrics(filters);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total}</div>
          <p className="text-xs text-muted-foreground">{metrics.newLeads} new leads</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">{metrics.won} won / {metrics.lost} lost</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${metrics.pipelineValue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">From active leads</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{followUpMetrics.overdue}</div>
          <p className="text-xs text-muted-foreground">{followUpMetrics.completionRate.toFixed(1)}% completion rate</p>
        </CardContent>
      </Card>
    </div>
  );
}
