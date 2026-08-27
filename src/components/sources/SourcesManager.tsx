"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createSourceAction, toggleSourceAction } from "@/lib/actions/sources"
import { Copy, Plus } from "lucide-react"

type Source = {
  id: string;
  name: string;
  type: string | null;
  isActive: number;
  webhookSecret: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  generic_webhook: "Generic Webhook",
  facebook_lead_ads: "Facebook Lead Ads",
  webform: "Web Form",
};

export function SourcesManager({ initialSources }: { initialSources: Source[] }) {
  const { toast } = useToast();
  const [sources, setSources] = React.useState<Source[]>(initialSources);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("generic_webhook");
  const [saving, setSaving] = React.useState(false);
  const [origin, setOrigin] = React.useState("");

  // Webhook URL is origin-relative; read it on the client so it's always the real deployed host.
  React.useEffect(() => setOrigin(window.location.origin), []);

  function webhookUrl(s: Source) {
    return `${origin}/api/webhooks/${s.type}?sourceId=${s.id}`;
  }

  function copy(text: string, what: string) {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: `${what} copied` }),
      () => toast({ variant: "destructive", title: "Copy failed" }),
    );
  }

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const row = await createSourceAction({ name: name.trim(), type: type as any });
      setSources((prev) => [...prev, row as Source]);
      setName("");
      toast({ title: "Source created", description: "Point your ad platform at the webhook URL below." });
    } catch {
      toast({ variant: "destructive", title: "Could not create source" });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: Source) {
    const next = s.isActive ? 0 : 1;
    setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: next } : x)));
    try {
      await toggleSourceAction(s.id, next === 1);
    } catch {
      // revert on failure
      setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: s.isActive } : x)));
      toast({ variant: "destructive", title: "Could not update source" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Create */}
      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-4">
        <h3 className="font-semibold">Connect a new source</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Source name (e.g. Facebook — Spring Campaign)" value={name}
            onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([v, label]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={create} disabled={saving || !name.trim()} className="gap-2">
            <Plus className="h-4 w-4" />{saving ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>

      {/* List */}
      {sources.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No lead sources yet.</div>
      ) : (
        <div className="space-y-4">
          {sources.map((s) => (
            <div key={s.id} className="border rounded-xl p-5 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="secondary">{TYPE_LABELS[s.type ?? ""] ?? s.type}</Badge>
                  <Badge variant={s.isActive ? "default" : "secondary"}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggle(s)}>
                  {s.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-500 block mb-1">Webhook URL</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate bg-slate-50 border rounded px-2 py-1 text-xs">{webhookUrl(s)}</code>
                    <Button variant="ghost" size="icon" onClick={() => copy(webhookUrl(s), "Webhook URL")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {s.webhookSecret && (
                  <div>
                    <span className="text-slate-500 block mb-1">Signing secret (HMAC SHA-256, header <code>x-hub-signature-256</code>)</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate bg-slate-50 border rounded px-2 py-1 text-xs">{s.webhookSecret}</code>
                      <Button variant="ghost" size="icon" onClick={() => copy(s.webhookSecret!, "Secret")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
