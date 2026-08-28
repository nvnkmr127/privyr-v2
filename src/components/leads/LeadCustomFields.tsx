"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Plus, X } from "lucide-react"
import { updateCustomDataAction } from "@/lib/actions/leads"

type Row = { key: string; value: string };

// Non-string values (nested webhook objects) are shown as JSON so nothing is hidden.
function toRows(data: Record<string, unknown>): Row[] {
  return Object.entries(data || {}).map(([key, v]) => ({
    key,
    value: typeof v === "string" ? v : JSON.stringify(v),
  }));
}

export function LeadCustomFields({ leadId, initialData }: { leadId: string; initialData: Record<string, unknown> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = React.useState<Row[]>(toRows(initialData));
  const [saving, setSaving] = React.useState(false);

  function set(i: number, field: "key" | "value", val: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  }

  async function save() {
    setSaving(true);
    try {
      // ponytail: values persist as strings; a nested value edited here is stored as its JSON text.
      const data: Record<string, string> = {};
      for (const { key, value } of rows) {
        const k = key.trim();
        if (k) data[k] = value;
      }
      await updateCustomDataAction(leadId, data);
      toast({ title: "Details saved" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not save details" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && <div className="text-xs text-muted-foreground">No extra fields.</div>}
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={row.key} onChange={(e) => set(i, "key", e.target.value)} placeholder="Field"
            className="h-8 text-xs w-2/5" />
          <Input value={row.value} onChange={(e) => set(i, "value", e.target.value)} placeholder="Value"
            className="h-8 text-xs flex-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} aria-label="Remove field">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" className="gap-1 text-xs"
          onClick={() => setRows((r) => [...r, { key: "", value: "" }])}>
          <Plus className="h-3.5 w-3.5" /> Add field
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
