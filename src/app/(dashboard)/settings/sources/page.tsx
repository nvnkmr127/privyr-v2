import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadSourceService } from "@/domains/leads/sourceService";
import { SourcesManager } from "@/components/sources/SourcesManager";

export default async function LeadSourcesPage() {
  const sources = await LeadSourceService.getSources();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lead Sources</h2>
          <p className="text-sm text-slate-500">Connect ad platforms and webhooks that feed leads into your CRM.</p>
        </div>
      </div>
      <SourcesManager initialSources={sources} />
    </div>
  );
}
