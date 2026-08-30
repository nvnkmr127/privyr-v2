"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { changeLeadStatusAction } from "@/lib/actions/leads"

const STATUSES = ["new", "active", "won", "lost", "unqualified"];

// Predefined categories align with the win/loss analytics buckets so they aggregate cleanly.
const LOSS_REASONS = [
  "Price / Budget Constraints",
  "Competitor Selected",
  "Product Fit / Missing Features",
  "No Response / Ghosted",
  "Unqualified / Out of Scope",
  "Other / Unspecified",
];

export function LeadStatusControl({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = React.useState(status);
  const [busy, setBusy] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState(LOSS_REASONS[0]);
  const [detail, setDetail] = React.useState("");

  async function apply(next: string, lossReason?: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    try {
      await changeLeadStatusAction(leadId, next, lossReason);
      toast({ title: `Status → ${next}` });
      router.refresh();
    } catch {
      setValue(prev);
      toast({ variant: "destructive", title: "Could not change status" });
    } finally {
      setBusy(false);
    }
  }

  function change(next: string) {
    if (next === value) return;
    // Marking lost/unqualified asks why — that reason powers win/loss analytics.
    if (next === "lost" || next === "unqualified") {
      setPendingStatus(next);
      setReason(LOSS_REASONS[0]);
      setDetail("");
      return;
    }
    apply(next);
  }

  function confirmLoss() {
    const full = detail.trim() ? `${reason} — ${detail.trim()}` : reason;
    const next = pendingStatus!;
    setPendingStatus(null);
    apply(next, full);
  }

  return (
    <>
      <Select value={value} onValueChange={change} disabled={busy}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
        </SelectContent>
      </Select>

      <Dialog open={!!pendingStatus} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Why is this lead {pendingStatus}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Optional detail…" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingStatus(null)}>Cancel</Button>
            <Button onClick={confirmLoss} disabled={busy}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
