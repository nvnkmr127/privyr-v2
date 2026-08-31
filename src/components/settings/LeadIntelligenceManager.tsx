"use client";

import * as React from "react";
import { Sparkles, Mail, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  updateEnrichmentAction,
  setInboundEmailAction,
  rotateInboundTokenAction,
} from "@/lib/actions/tenantIntegrations";

type View = {
  enrichmentEnabled: boolean;
  enrichmentApiUrl: string | null;
  enrichmentAuthHeader: string | null;
  hasEnrichmentAuthValue: boolean;
  enrichmentTimeoutMs: number | null;
  inboundEmailEnabled: boolean;
  inboundEmailToken: string | null;
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

export function LeadIntelligenceManager({ initial }: { initial: View }) {
  const { toast } = useToast();
  const [v, setV] = React.useState(initial);
  const [apiUrl, setApiUrl] = React.useState(initial.enrichmentApiUrl ?? "");
  const [authHeader, setAuthHeader] = React.useState(initial.enrichmentAuthHeader ?? "");
  const [authValue, setAuthValue] = React.useState("");
  const [timeoutMs, setTimeoutMs] = React.useState(initial.enrichmentTimeoutMs ? String(initial.enrichmentTimeoutMs) : "");
  const [enrichEnabled, setEnrichEnabled] = React.useState(initial.enrichmentEnabled);
  const [savingEnrich, setSavingEnrich] = React.useState(false);
  const [busyInbound, setBusyInbound] = React.useState(false);

  const webhookUrl =
    v.inboundEmailToken && typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/email?token=${v.inboundEmailToken}`
      : null;

  async function saveEnrichment() {
    setSavingEnrich(true);
    try {
      const res = await updateEnrichmentAction({
        apiUrl,
        authHeader: authHeader || undefined,
        authValue: authValue || undefined,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
        enabled: enrichEnabled,
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't save", description: res.message });
        return;
      }
      setV((s) => ({ ...s, ...res.data }));
      setAuthValue("");
      toast({ title: "Enrichment settings saved" });
    } catch {
      toast({ variant: "destructive", title: "Couldn't save", description: "We couldn't reach the server." });
    } finally {
      setSavingEnrich(false);
    }
  }

  async function toggleInbound(enabled: boolean) {
    setBusyInbound(true);
    try {
      const res = await setInboundEmailAction(enabled);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't update", description: res.message });
        return;
      }
      setV(res.data);
      toast({ title: enabled ? "Inbound email enabled" : "Inbound email disabled" });
    } finally {
      setBusyInbound(false);
    }
  }

  async function rotate() {
    setBusyInbound(true);
    try {
      const res = await rotateInboundTokenAction();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't rotate", description: res.message });
        return;
      }
      setV(res.data);
      toast({ title: "New webhook URL generated", description: "Update it in your email provider." });
    } finally {
      setBusyInbound(false);
    }
  }

  function copyUrl() {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast({ title: "Copied webhook URL" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Enrichment */}
      <div className="rounded-2xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" /> Lead enrichment
          </p>
          <Toggle checked={enrichEnabled} onChange={setEnrichEnabled} />
        </div>
        <p className="text-xs text-muted-foreground">
          When on, new leads are looked up against your data provider and observed facts (company,
          title, socials) are attached as evidence. Nothing is assumed about the provider — set the
          endpoint, the auth header, and the timeout to match yours.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Provider URL</Label>
            <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.provider.com/enrich" autoCapitalize="none" />
          </div>
          <div>
            <Label>Auth header name</Label>
            <Input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} placeholder="Authorization" autoCapitalize="none" />
            <p className="mt-1 text-xs text-muted-foreground">Blank = Authorization. Or e.g. x-api-key.</p>
          </div>
          <div>
            <Label>Auth header value</Label>
            <Input
              type="password"
              value={authValue}
              onChange={(e) => setAuthValue(e.target.value)}
              placeholder={v.hasEnrichmentAuthValue ? "•••••••• (leave blank to keep)" : "Bearer sk-… or the raw key"}
              autoCapitalize="none"
            />
          </div>
          <div>
            <Label>Timeout (ms)</Label>
            <Input value={timeoutMs} onChange={(e) => setTimeoutMs(e.target.value)} placeholder="10000" inputMode="numeric" />
            <p className="mt-1 text-xs text-muted-foreground">Blank = 10000. Range 1000–60000.</p>
          </div>
        </div>
        <Button onClick={saveEnrichment} disabled={savingEnrich}>{savingEnrich ? "Saving…" : "Save"}</Button>
      </div>

      {/* Inbound email */}
      <div className="rounded-2xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" /> Inbound email → timeline
          </p>
          <Toggle checked={v.inboundEmailEnabled} onChange={toggleInbound} />
        </div>
        <p className="text-xs text-muted-foreground">
          Forward parsed inbound email from your provider (Postmark, Mailgun, Resend, SendGrid) to
          the URL below. Replies land on the matching lead&apos;s timeline. Keep this URL secret.
        </p>
        {v.inboundEmailEnabled && webhookUrl && (
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" onClick={copyUrl} title="Copy"><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={rotate} disabled={busyInbound} title="Rotate"><RefreshCw className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Rotating generates a new URL and invalidates the old one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
