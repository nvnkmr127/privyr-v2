"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteLeadAction } from "@/lib/actions/leads";

// Sends a lead to the recycle bin (soft delete). Recoverable there for 30 days.
export function DeleteLeadButton({ leadId, leadName }: { leadId: string; leadName?: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function del() {
    if (!confirm(`Move ${leadName || "this lead"} to the recycle bin? You can restore it within 30 days.`)) return;
    setBusy(true);
    try {
      await deleteLeadAction(leadId);
      toast({ title: "Moved to recycle bin", description: "Restore it any time within 30 days." });
      router.push("/leads");
    } catch {
      toast({ variant: "destructive", title: "Couldn't delete", description: "You may not have permission." });
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={del} disabled={busy} className="h-9 gap-1.5 text-destructive hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Delete</span>
    </Button>
  );
}
