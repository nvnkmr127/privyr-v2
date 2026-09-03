import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrg, hasPermission } from "@/lib/rbac";
import { AuditService } from "@/domains/audit/service";

function actorName(l: { actorFirst: string | null; actorLast: string | null; actorEmail: string | null }) {
  return [l.actorFirst, l.actorLast].filter(Boolean).join(" ") || l.actorEmail || "System";
}

export default async function AuditPage() {
  if (!(await hasPermission("audit.view"))) redirect("/leads");
  const { organizationId } = await requireOrg();
  const logs = await AuditService.list(organizationId);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/settings"><Button variant="ghost" size="icon" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-sm text-muted-foreground">A record of sensitive actions taken in your workspace.</p>
        </div>
      </div>

      <div className="border rounded-2xl bg-card divide-y text-sm">
        {logs.length === 0 && <div className="p-6 text-muted-foreground">No activity recorded yet.</div>}
        {logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{l.action}</span>
              <span className="text-muted-foreground">{actorName(l)}</span>
              {l.entityType && <span className="text-muted-foreground">{l.entityType}</span>}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
