"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions/apiKeys";
import { Key, Plus, Copy } from "lucide-react";

type ApiKey = { id: string; name: string; prefix: string; lastUsedAt: Date | null; revokedAt: Date | null; createdAt: Date | string };

export function ApiKeysManager({ initial }: { initial: ApiKey[] }) {
  const { toast } = useToast();
  const [keys, setKeys] = React.useState<ApiKey[]>(initial);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [newKey, setNewKey] = React.useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await createApiKeyAction(name.trim());
      setNewKey(created.key);
      setKeys((prev) => [{ id: created.id, name: created.name, prefix: created.prefix, lastUsedAt: null, revokedAt: null, createdAt: new Date() }, ...prev]);
      setName("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not create key", description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  async function revoke(k: ApiKey) {
    if (!confirm(`Revoke "${k.name}"? Apps using it will stop working immediately.`)) return;
    try {
      await revokeApiKeyAction(k.id);
      setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, revokedAt: new Date() } : x)));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not revoke", description: e?.message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-xl p-6 bg-card shadow-sm space-y-3">
        <div className="flex items-center gap-2"><Key className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">API Keys</h3></div>
        <p className="text-sm text-muted-foreground">
          Authenticate with <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer &lt;key&gt;</code> against
          {" "}<code className="text-xs bg-muted px-1 rounded">/api/v1/leads</code>.
        </p>
        <div className="flex gap-2 max-w-md">
          <Input placeholder="Key name (e.g. Zapier)" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }} />
          <Button variant="outline" onClick={create} disabled={saving || !name.trim()} className="gap-1"><Plus className="h-4 w-4" /> Create</Button>
        </div>

        {newKey && (
          <div className="rounded-lg border border-border bg-muted p-3 space-y-2">
            <div className="text-sm font-medium text-foreground">Copy your key now — it won’t be shown again.</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-card border rounded px-2 py-1.5 break-all">{newKey}</code>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { navigator.clipboard?.writeText(newKey); toast({ title: "Copied" }); }}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <button className="text-xs text-muted-foreground underline" onClick={() => setNewKey(null)}>Done</button>
          </div>
        )}
      </div>

      <div className="border rounded-xl bg-card shadow-sm divide-y">
        {keys.length === 0 && <div className="p-6 text-sm text-muted-foreground">No API keys yet.</div>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{k.name}</span>
              <code className="text-xs text-muted-foreground">{k.prefix}…</code>
              {k.revokedAt ? <Badge variant="secondary">Revoked</Badge> : <Badge>Active</Badge>}
              {k.lastUsedAt && <span className="text-xs text-muted-foreground">last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
            </div>
            {!k.revokedAt && <Button size="sm" variant="outline" onClick={() => revoke(k)}>Revoke</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
