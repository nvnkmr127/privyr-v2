"use client";

import * as React from "react";
import { Trash2, Plus, Webhook, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "@/lib/actions/webhooks";

// Client-safe copy — the server service pulls in `db`, so we can't import its const here.
const EVENT_TYPES: { key: string; label: string }[] = [
  { key: "lead.created", label: "Lead created" },
  { key: "lead.status_changed", label: "Status changed" },
  { key: "lead.hot_threshold", label: "Lead went hot" },
  { key: "lead.stagnant_alert", label: "Lead stagnant" },
];

type Endpoint = {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: number;
};

export function WebhooksManager({ initial, dlqCount }: { initial: Endpoint[]; dlqCount: number }) {
  const { toast } = useToast();
  const [endpoints, setEndpoints] = React.useState<Endpoint[]>(initial);
  const [url, setUrl] = React.useState("");
  const [events, setEvents] = React.useState<string[]>(["lead.created"]);
  const [saving, setSaving] = React.useState(false);

  function toggleEvent(key: string) {
    setEvents((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  }

  async function add() {
    if (!url.trim() || events.length === 0) return;
    setSaving(true);
    try {
      const res = await createWebhookEndpointAction({ url: url.trim(), events });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't add webhook", description: res.message });
        return;
      }
      setEndpoints((prev) => [...prev, res.data as Endpoint]);
      setUrl("");
      setEvents(["lead.created"]);
      toast({ title: "Webhook added", description: "We'll POST a signed payload on the selected events." });
    } catch {
      toast({ variant: "destructive", title: "Couldn't add webhook", description: "We couldn't reach the server. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(e: Endpoint) {
    const next = e.isActive ? 0 : 1;
    setEndpoints((prev) => prev.map((x) => (x.id === e.id ? { ...x, isActive: next } : x)));
    try {
      const res = await toggleWebhookEndpointAction(e.id, next === 1);
      if (!res.ok) {
        setEndpoints((prev) => prev.map((x) => (x.id === e.id ? { ...x, isActive: e.isActive } : x)));
        toast({ variant: "destructive", title: "Couldn't update webhook", description: res.message });
      }
    } catch {
      setEndpoints((prev) => prev.map((x) => (x.id === e.id ? { ...x, isActive: e.isActive } : x)));
      toast({ variant: "destructive", title: "Couldn't update webhook", description: "We couldn't reach the server." });
    }
  }

  async function remove(e: Endpoint) {
    if (!confirm(`Delete webhook to ${e.url}?`)) return;
    const prev = endpoints;
    setEndpoints((p) => p.filter((x) => x.id !== e.id));
    try {
      const res = await deleteWebhookEndpointAction(e.id);
      if (!res.ok) {
        setEndpoints(prev);
        toast({ variant: "destructive", title: "Couldn't delete", description: res.message });
      }
    } catch {
      setEndpoints(prev);
      toast({ variant: "destructive", title: "Couldn't delete", description: "We couldn't reach the server." });
    }
  }

  function copySecret(secret: string) {
    navigator.clipboard?.writeText(secret).then(
      () => toast({ title: "Signing secret copied" }),
      () => toast({ variant: "destructive", title: "Copy failed" }),
    );
  }

  return (
    <div className="space-y-6">
      {dlqCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {dlqCount} delivery{dlqCount === 1 ? "" : "ies"} failed permanently and moved to the dead-letter queue.
        </div>
      )}

      {/* Add form */}
      <div className="rounded-2xl border p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Webhook className="h-4 w-4" /> Add an endpoint</p>
        <Input placeholder="https://your-app.com/webhooks/privyr" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((et) => (
            <button
              key={et.key}
              type="button"
              onClick={() => toggleEvent(et.key)}
              className={`rounded-full border px-3 py-1 text-xs ${events.includes(et.key) ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground"}`}
            >
              {et.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={add} disabled={saving || !url.trim() || events.length === 0} className="gap-2">
            <Plus className="h-4 w-4" /> {saving ? "Adding…" : "Add webhook"}
          </Button>
        </div>
      </div>

      {/* List */}
      {endpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground">No webhooks yet. Add one above to receive lead events.</p>
      ) : (
        <div className="space-y-2">
          {endpoints.map((e) => (
            <div key={e.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.url}</p>
                <p className="truncate text-xs text-muted-foreground">{(e.events ?? []).join(", ") || "no events"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => copySecret(e.secret)}>
                  <Copy className="h-3.5 w-3.5" /> Secret
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggle(e)}>
                  {e.isActive ? "Active" : "Paused"}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(e)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Each request is signed with HMAC-SHA256 over the raw body in the <code>X-Privyr-Signature</code> header —
        verify it with the endpoint&apos;s signing secret.
      </p>
    </div>
  );
}
