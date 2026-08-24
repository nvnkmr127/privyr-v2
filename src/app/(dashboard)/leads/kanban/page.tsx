import { EmptyState } from "@/components/ui/empty-state";
import { KanbanSquare } from "lucide-react";

export default function KanbanPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Pipeline</h2>
      </div>
      <div className="flex-1 min-h-0 bg-slate-100 rounded-xl border border-dashed flex items-center justify-center">
         <EmptyState
          icon={<KanbanSquare className="h-10 w-10" />}
          title="Pipeline Empty"
          description="Your pipeline stages will appear here once configured."
          className="border-none bg-transparent"
        />
      </div>
    </div>
  );
}
