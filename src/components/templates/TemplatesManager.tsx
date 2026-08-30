"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from "@/lib/actions/messaging"
import { Plus, Trash2, Pencil, X } from "lucide-react"

type Template = {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
};

const CHANNELS = ["whatsapp", "sms", "email"] as const;

export function TemplatesManager({ initialTemplates }: { initialTemplates: Template[] }) {
  const { toast } = useToast();
  const [templates, setTemplates] = React.useState<Template[]>(initialTemplates);
  const [name, setName] = React.useState("");
  const [channel, setChannel] = React.useState<(typeof CHANNELS)[number]>("whatsapp");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  function resetForm() {
    setEditingId(null); setName(""); setChannel("whatsapp"); setSubject(""); setBody("");
  }

  function startEdit(t: Template) {
    setEditingId(t.id); setName(t.name); setChannel(t.channel as any); setSubject(t.subject ?? ""); setBody(t.body);
  }

  async function save() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      channel,
      subject: channel === "email" && subject.trim() ? subject.trim() : undefined,
      body,
    };
    try {
      if (editingId) {
        const row = await updateTemplateAction({ id: editingId, ...payload });
        setTemplates((prev) => prev.map((t) => (t.id === editingId ? (row as Template) : t)));
        toast({ title: "Template updated" });
      } else {
        const row = await createTemplateAction(payload);
        setTemplates((prev) => [row as Template, ...prev]);
        toast({ title: "Template saved" });
      }
      resetForm();
    } catch {
      toast({ variant: "destructive", title: "Could not save template" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const prev = templates;
    setTemplates((t) => t.filter((x) => x.id !== id));
    try {
      await deleteTemplateAction(id);
    } catch {
      setTemplates(prev);
      toast({ variant: "destructive", title: "Could not delete template" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-2xl p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{editingId ? "Edit template" : "New template"}</h3>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm} className="gap-1 text-xs">
              <X className="h-3.5 w-3.5" /> Cancel edit
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {channel === "email" && (
          <Input placeholder="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        )}
        <Textarea placeholder="Message body — use {{first_name}}, {{name}}, {{email}}, {{phone}}, {{company}}"
          className="min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || !name.trim() || !body.trim()} className="gap-2">
            <Plus className="h-4 w-4" />{saving ? "Saving…" : editingId ? "Update template" : "Save template"}
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No templates yet.</div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="border rounded-2xl p-5 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="secondary">{t.channel}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(t)} title="Edit">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)} title="Delete" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {t.subject && <div className="text-sm text-muted-foreground mb-1">Subject: {t.subject}</div>}
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
