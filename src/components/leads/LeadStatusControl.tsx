"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { changeLeadStatusAction } from "@/lib/actions/leads"

const STATUSES = ["new", "active", "won", "lost", "unqualified"];

export function LeadStatusControl({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = React.useState(status);
  const [busy, setBusy] = React.useState(false);

  async function change(next: string) {
    if (next === value) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    try {
      await changeLeadStatusAction(leadId, next);
      toast({ title: `Status → ${next}` });
      router.refresh(); // pick up the status-change entry the server logged to the timeline
    } catch {
      setValue(prev);
      toast({ variant: "destructive", title: "Could not change status" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Select value={value} onValueChange={change} disabled={busy}>
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
