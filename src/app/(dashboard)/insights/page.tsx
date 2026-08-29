import { TrendingUp, Trophy, Network, HeartPulse } from "lucide-react";
import { requireOrg } from "@/lib/rbac";
import { RevenueForecastService } from "@/domains/leads/revenueForecastService";
import { WinLossAnalyticsService } from "@/domains/leads/winLossAnalyticsService";
import { SourceRoiAnalyticsService } from "@/domains/leads/sourceRoiAnalyticsService";
import { EngagementHealthService } from "@/domains/leads/engagementHealthService";
import { OptimalContactTimeService } from "@/domains/leads/optimalContactTimeService";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function InsightsPage() {
  const { organizationId } = await requireOrg();
  const [forecast, winLoss, sourceRoi, health, bestTime] = await Promise.all([
    RevenueForecastService.getRevenueForecast(organizationId),
    WinLossAnalyticsService.getWinLossAnalytics(organizationId),
    SourceRoiAnalyticsService.getLeadSourceRoiMetrics(organizationId),
    EngagementHealthService.getEngagementHealthBreakdown(organizationId),
    OptimalContactTimeService.getOptimalContactTimes(organizationId),
  ]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Insights</h2>
        <p className="text-sm text-muted-foreground">Forecast, win/loss, source ROI, and pipeline health at a glance.</p>
      </div>

      {/* Best time to reach */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-sky-500" /> Best time to reach your leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Best hour" value={bestTime.bestHourOfDayLabel} sub="When contact most often lands" />
            <Stat label="Best day" value={bestTime.bestDayOfWeek} sub="Highest-response weekday" />
            <Stat label="Based on" value={`${bestTime.totalTouchpointsAnalyzed}`} sub="touchpoints analyzed" />
          </div>
        </CardContent>
      </Card>

      {/* Revenue forecast */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Revenue forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Weighted projection" value={money(forecast.weightedProjectedRevenue)} sub="Probability-adjusted open pipeline" />
            <Stat label="Unweighted pipeline" value={money(forecast.unweightedTotalValue)} sub="Total value of open leads" />
            <Stat label="Won revenue" value={money(forecast.wonRevenue)} sub="Closed-won to date" />
          </div>
          {forecast.stageBreakdown.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Weighted value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.stageBreakdown.map((s) => (
                  <TableRow key={s.status}>
                    <TableCell className="capitalize">{s.status}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.leadCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{Math.round(s.probabilityWeight * 100)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.weightedValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Win/loss */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" /> Win / loss
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Win rate" value={`${winLoss.winRatePercentage.toFixed(0)}%`} />
              <Stat label="Won" value={String(winLoss.wonCount)} />
              <Stat label="Lost" value={String(winLoss.lostCount)} />
              <Stat label="Unqualified" value={String(winLoss.unqualifiedCount)} />
            </div>
            {winLoss.lossReasonBreakdown.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top loss reasons</p>
                {winLoss.lossReasonBreakdown.map((r) => (
                  <div key={r.reason} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{r.reason}</span>
                    <span className="text-muted-foreground tabular-nums">{r.count} ({r.percentage.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No closed-lost leads yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Engagement health */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-rose-500" /> Pipeline health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Health score" value={`${health.healthScorePercentage.toFixed(0)}%`} sub={`${health.totalActiveLeads} active`} />
              <Stat label="Healthy" value={String(health.healthyCount)} />
              <Stat label="At risk" value={String(health.atRiskCount)} />
              <Stat label="Critical" value={String(health.criticalCount)} />
            </div>
            {health.criticalLeads.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Needs attention now</p>
                {health.criticalLeads.slice(0, 5).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{l.name || "Unnamed lead"}</span>
                    <Badge variant="outline">{l.daysSinceContact}d silent</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source ROI */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-violet-500" /> Lead source ROI
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourceRoi.length === 0 ? (
            <p className="text-sm text-muted-foreground">No source data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg deal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceRoi.map((s) => (
                  <TableRow key={s.sourceId ?? s.sourceName}>
                    <TableCell>
                      {s.sourceName}
                      <div className="text-xs text-muted-foreground">{s.sourceType}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.totalLeads}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.wonLeads}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.winRatePercentage.toFixed(0)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.totalRevenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.avgDealValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
