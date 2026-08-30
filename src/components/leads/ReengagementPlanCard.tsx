import { RefreshCw } from "lucide-react";
import { ReengagementCadenceService } from "@/domains/leads/reengagementCadenceService";

// Server component: for a lead that's gone cold, suggest a multi-channel win-back cadence.
// Renders nothing for recently-contacted leads.
export async function ReengagementPlanCard({ leadId, organizationId }: { leadId: string; organizationId: string }) {
  let cadence;
  try {
    cadence = await ReengagementCadenceService.getLeadReengagementCadence(leadId, organizationId);
  } catch {
    return null;
  }
  if (cadence.daysInactive < 14 || cadence.recommendedCadence.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border p-5 bg-card space-y-3">
      <p className="text-sm font-semibold flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-amber-500" /> Re-engagement plan
      </p>
      <p className="text-xs text-muted-foreground">
        Cold for {cadence.daysInactive} days — suggested win-back cadence:
      </p>
      <ol className="space-y-2">
        {cadence.recommendedCadence.map((s) => (
          <li key={s.stepNumber} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="text-muted-foreground tabular-nums">Day {s.dayOffset}</span>
            <span className="font-medium capitalize">{s.channel}</span>
            <span className="text-muted-foreground">— {s.actionTitle}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
