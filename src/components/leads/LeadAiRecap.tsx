"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeLeadAction } from "@/lib/actions/ai";

// One-tap "where does this lead stand" recap. On-demand so we only spend an AI call when asked.
export function LeadAiRecap({ leadId }: { leadId: string }) {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    try {
      const { summary } = await summarizeLeadAction({ leadId });
      setSummary(summary);
    } catch {
      setSummary("Couldn't generate a recap right now.");
    } finally {
      setLoading(false);
    }
  }

  if (summary) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
        <p className="text-foreground/90">{summary}</p>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={loading} className="gap-2">
      <Sparkles className="h-4 w-4" />
      {loading ? "Summarizing…" : "AI recap"}
    </Button>
  );
}
