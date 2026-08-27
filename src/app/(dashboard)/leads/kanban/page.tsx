import Link from "next/link";
import { Button } from "@/components/ui/button";
import { List } from "lucide-react";
import { LeadService } from "@/domains/leads/service";
import { requireOrg } from "@/lib/rbac";
import { KanbanBoard } from "@/components/leads/KanbanBoard";

export default async function KanbanPage() {
  // ponytail: loads up to 500 leads, no pagination. Fine for a solo/small-team pipeline;
  // add per-column pagination if a stage ever holds thousands.
  const { organizationId } = await requireOrg();
  const { data: leads } = await LeadService.listLeads({ organizationId, limit: 500 });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Pipeline</h2>
        <Link href="/leads">
          <Button variant="outline"><List className="mr-2 h-4 w-4" /> List view</Button>
        </Link>
      </div>
      <KanbanBoard initialLeads={leads} />
    </div>
  );
}
