"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createCustomFieldAction, deleteCustomFieldAction } from "@/lib/actions/customFields";
import { Plus, Trash2 } from "lucide-react";

type Field = {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
};

const TYPES = ["text", "number", "date", "select"] as const;

export function CustomFieldsManager({ initial }: { initial: Field[] }) {
  const { toast } = useToast();
  const [fields, setFields] = React.useState<Field[]>(initial);
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<(typeof TYPES)[number]>("text");
  const [options, setOptions] = React.useState("");
  const [required, setRequired] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function create() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const row = await createCustomFieldAction({
        label: label.trim(),
        type,
        required,
        options: type === "select" ? options.split(",").map((o) => o.trim()).filter(Boolean) : [],
      });
      setFields((prev) => [...prev, row as Field]);
      setLabel(""); setOptions(""); setRequired(false); setType("text");
      toast({ title: "Field added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not add field", description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(f: Field) {
    if (!confirm(`Delete field "${f.label}"?`)) return;
    const prev = fields;
    setFields((p) => p.filter((x) => x.id !== f.id));
    try {
      await deleteCustomFieldAction(f.id);
    } catch (e: any) {
      setFields(prev);
      toast({ variant: "destructive", title: "Could not delete", description: e?.message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-xl p-6 bg-card shadow-sm space-y-3">
        <h3 className="font-semibold">Add a custom field</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Field label (e.g. Budget)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as any)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
          {type === "select" && (
            <Input placeholder="Options, comma-separated" value={options} onChange={(e) => setOptions(e.target.value)} className="sm:col-span-2" />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4" />
            Required
          </label>
        </div>
        <div className="flex justify-end">
          <Button onClick={create} disabled={saving || !label.trim()} className="gap-1">
            <Plus className="h-4 w-4" /> Add field
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm divide-y">
        {fields.length === 0 && <div className="p-6 text-sm text-muted-foreground">No custom fields yet.</div>}
        {fields.map((f) => (
          <div key={f.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="font-medium">{f.label}</span>
              <span className="text-xs font-mono text-muted-foreground">{f.key}</span>
              <Badge variant="secondary" className="capitalize">{f.type}</Badge>
              {f.required && <Badge>Required</Badge>}
              {f.type === "select" && f.options?.length ? (
                <span className="text-xs text-muted-foreground">{f.options.join(", ")}</span>
              ) : null}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(f)}><Trash2 className="h-4 w-4 text-foreground" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
