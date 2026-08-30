import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX, ArrowLeft } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Resource Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The lead, sequence, or setting you requested does not exist or has been deleted.
          </p>
        </div>
        <div className="pt-2">
          <Button asChild className="gap-2">
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4" /> Back to Leads
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
