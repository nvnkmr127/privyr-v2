import { EmptyState } from "@/components/ui/empty-state";
import { Settings } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          {/* Navigation items for settings */}
          <div className="bg-slate-200 p-2 rounded text-sm font-medium">General</div>
          <Link href="/settings/sources" className="block p-2 rounded text-sm text-slate-500 hover:bg-slate-100 cursor-pointer">Lead Sources</Link>
          <Link href="/settings/templates" className="block p-2 rounded text-sm text-slate-500 hover:bg-slate-100 cursor-pointer">Message Templates</Link>
          <div className="p-2 rounded text-sm text-slate-500 hover:bg-slate-100 cursor-pointer">Users & Roles</div>
          <div className="p-2 rounded text-sm text-slate-500 hover:bg-slate-100 cursor-pointer">Teams</div>
          <div className="p-2 rounded text-sm text-slate-500 hover:bg-slate-100 cursor-pointer">Pipelines</div>
        </div>
        <div className="md:col-span-3">
          <EmptyState
            icon={<Settings className="h-10 w-10" />}
            title="General Settings"
            description="Configure your CRM workspace settings here."
          />
        </div>
      </div>
    </div>
  );
}
