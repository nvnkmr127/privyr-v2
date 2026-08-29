import { EmptyState } from "@/components/ui/empty-state";
import { Zap, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAutomations } from "@/lib/actions/automations";
import { AutomationTemplates } from "@/components/automations/AutomationTemplates";

export default async function AutomationsPage() {
  const automations = await getAutomations();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Automations</h2>
        <div className="flex items-center space-x-2">
          <Link href="/automations/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Automation
            </Button>
          </Link>
        </div>
      </div>
      
      <AutomationTemplates />

      {automations.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-10 w-10" />}
          title="No active automations"
          description="Create workflows to automatically assign leads, send follow-ups, and update statuses."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((automation) => (
            <div key={automation.id} className="border p-4 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="font-medium">{automation.name}</h3>
                <p className="text-sm text-muted-foreground">{automation.isActive ? 'Active' : 'Inactive'}</p>
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
