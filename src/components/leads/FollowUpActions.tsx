"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { completeFollowUp, snoozeFollowUp, cancelFollowUp } from "@/lib/actions/follow-ups";

// Inline actions for a pending follow-up: mark done, snooze a day or three, or cancel.
export function FollowUpActions({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast({ title: msg });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Action failed" });
    } finally {
      setBusy(false);
    }
  }

  const snoozeTo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" disabled={busy} className="gap-1.5 text-emerald-600"
        onClick={() => run(() => completeFollowUp(id), "Follow-up completed")}>
        <Check className="h-3.5 w-3.5" /> Done
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} className="gap-1.5"
        onClick={() => run(() => snoozeFollowUp(id, snoozeTo(1)), "Snoozed 1 day")}>
        <Clock className="h-3.5 w-3.5" /> +1d
      </Button>
      <Button variant="ghost" size="sm" disabled={busy}
        onClick={() => run(() => snoozeFollowUp(id, snoozeTo(3)), "Snoozed 3 days")}>
        +3d
      </Button>
      <Button variant="ghost" size="icon" disabled={busy} className="text-destructive hover:text-destructive"
        title="Cancel follow-up" onClick={() => run(() => cancelFollowUp(id), "Follow-up cancelled")}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
