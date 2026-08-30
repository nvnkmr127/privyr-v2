"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Failed to load this view</h2>
          <p className="text-sm text-muted-foreground">
            {error?.message && !error.message.includes("digest")
              ? error.message
              : "An unexpected error occurred while loading this section. Your lead data is unaffected."}
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Button onClick={() => reset()} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
