"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createSourceAction, toggleSourceAction, renameSourceAction, deleteSourceAction } from "@/lib/actions/sources";
import { Copy, Globe, MessageSquare, ExternalLink, CheckCircle2, Sparkles, ShieldCheck, Pencil, Trash2, FileText, Plus, SlidersHorizontal } from "lucide-react";
import { FormFieldsEditor } from "./FormFieldsEditor";

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

type Source = {
  id: string;
  name: string;
  type: string | null;
  isActive: number;
  webhookSecret: string | null;
  config?: unknown;
};

interface IntegrationPlatformCard {
  id: string;
  name: string;
  typeKey: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  brandColor: string;
  buttonText: string;
  buttonBg: string;
  docsUrl: string;
}

const PLATFORMS: IntegrationPlatformCard[] = [
  {
    id: "facebook",
    name: "Facebook & Instagram Lead Ads",
    typeKey: "facebook_lead_ads",
    description: "Instant lead pulling from Meta Graph API with automatic form field mapping & Page OAuth refresh.",
    icon: FacebookIcon,
    badge: "Official Meta API",
    brandColor: "bg-muted border-border text-muted-foreground",
    buttonText: "Connect Facebook Lead Ads",
    buttonBg: "bg-secondary hover:bg-accent text-foreground",
    docsUrl: "https://developers.facebook.com/docs/marketing-api/guides/lead-ads",
  },
  {
    id: "google",
    name: "Google Lead Form Ads",
    typeKey: "google_lead_ads",
    description: "Real-time webhook ingestion for Google Ads campaign forms with keyword & column normalization.",
    icon: Globe,
    badge: "Google Ads Webhook",
    brandColor: "bg-muted border-border text-foreground",
    buttonText: "Connect Google Lead Ads",
    buttonBg: "bg-destructive hover:bg-accent text-foreground",
    docsUrl: "https://support.google.com/google-ads/answer/9360341",
  },
  {
    id: "linkedin",
    name: "LinkedIn Lead Gen Forms",
    typeKey: "linkedin_lead_gen",
    description: "Inbound B2B lead sync for LinkedIn sponsored content & lead generation campaigns.",
    icon: LinkedInIcon,
    badge: "B2B Lead Sync",
    brandColor: "bg-muted border-border text-muted-foreground",
    buttonText: "Connect LinkedIn Lead Gen",
    buttonBg: "bg-secondary hover:bg-accent text-foreground",
    docsUrl: "https://www.linkedin.com/help/linkedin/answer/a420556",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Direct Inbound",
    typeKey: "whatsapp_inbound",
    description: "Capture inbound messages as leads with automated instant reply & round-robin assignment.",
    icon: MessageSquare,
    badge: "WhatsApp Cloud API",
    brandColor: "bg-muted border-border text-muted-foreground",
    buttonText: "Connect WhatsApp Business",
    buttonBg: "bg-secondary hover:bg-accent text-foreground",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  },
  {
    id: "webhook",
    name: "Website Custom Webhook",
    typeKey: "generic_webhook",
    description: "Connect WordPress, Elementor, Webflow, or custom HTML forms using signed REST Webhooks.",
    icon: Sparkles,
    badge: "Universal REST Webhook",
    brandColor: "bg-muted border-border text-muted-foreground",
    buttonText: "Generate Webhook Endpoint",
    buttonBg: "bg-secondary hover:bg-accent text-foreground",
    docsUrl: "/docs/webhooks",
  },
];

export function SourcesManager({ initialSources }: { initialSources: Source[] }) {
  const { toast } = useToast();
  const [sources, setSources] = React.useState<Source[]>(initialSources);
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [creatingForm, setCreatingForm] = React.useState(false);
  const [editingFormId, setEditingFormId] = React.useState<string | null>(null);
  const [origin, setOrigin] = React.useState("");

  React.useEffect(() => setOrigin(window.location.origin), []);

  // Handshake listener for OAuth popup window postMessage callbacks
  React.useEffect(() => {
    function handleOAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "OAUTH_RESPONSE" && event.data?.status === "success") {
        const providerName = event.data.provider === "facebook" ? "Facebook Lead Ads" : event.data.provider;
        toast({
          title: `${providerName} Connected Successfully`,
          description: `Page ID: ${event.data.data?.pageId || "Connected"}. Lead pulling active.`,
        });

        // Add newly connected source to local state
        const newSource: Source = {
          id: `src_oauth_${Date.now()}`,
          name: `${providerName} Connection`,
          type: event.data.provider === "facebook" ? "facebook_lead_ads" : `${event.data.provider}_lead_gen`,
          isActive: 1,
          webhookSecret: `sec_${Date.now()}`,
        };

        setSources((prev) => [...prev, newSource]);
      }
    }

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [toast]);

  function webhookUrl(s: Source) {
    return `${origin}/api/webhooks/${s.type}?sourceId=${s.id}`;
  }

  function copy(text: string, what: string) {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: `${what} copied to clipboard` }),
      () => toast({ variant: "destructive", title: "Copy failed" })
    );
  }

  async function handleConnectPlatform(platform: IntegrationPlatformCard) {
    setConnectingId(platform.id);
    try {
      if (platform.id === "facebook") {
        // Honest gate: without a real Meta app id we can't connect a Page. Don't fake a source.
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        if (!appId || appId === "mock_app_id") {
          toast({
            variant: "destructive",
            title: "Facebook Lead Ads isn't set up yet",
            description: "Add your Meta app credentials (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) to enable this integration.",
          });
          return;
        }
        // Real OAuth. The source is created after the callback confirms the connection — not before.
        const redirectUri = encodeURIComponent(`${origin}/api/auth/facebook/callback`);
        const scope = encodeURIComponent("pages_show_list,leads_retrieval,pages_manage_ads");
        window.location.href =
          `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=tenant_oauth`;
        return;
      } else {
        const res = await createSourceAction({
          name: `${platform.name} Integration`,
          type: platform.typeKey as any,
        });
        if (!res.ok) {
          toast({ variant: "destructive", title: `Failed to connect ${platform.name}`, description: res.message });
          return;
        }
        setSources((prev) => [...prev, res.data as Source]);
        toast({
          title: `${platform.name} Connected`,
          description: `Integration endpoint activated. Use the webhook URL below to receive leads.`,
        });
      }
    } catch {
      toast({ variant: "destructive", title: `Failed to connect ${platform.name}`, description: "We couldn't reach the server. Please try again." });
    } finally {
      setConnectingId(null);
    }
  }

  async function createWebForm() {
    const name = window.prompt("Name your web form", "Website Enquiry Form")?.trim();
    if (!name) return;
    setCreatingForm(true);
    try {
      const res = await createSourceAction({ name, type: "webform" as any });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't create form", description: res.message });
        return;
      }
      setSources((prev) => [...prev, res.data as Source]);
      toast({ title: "Web form created", description: "Copy its hosted link or embed code from the list below." });
    } catch {
      toast({ variant: "destructive", title: "Couldn't create form", description: "We couldn't reach the server. Please try again." });
    } finally {
      setCreatingForm(false);
    }
  }

  async function toggle(s: Source) {
    const next = s.isActive ? 0 : 1;
    setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: next } : x)));
    try {
      const res = await toggleSourceAction(s.id, next === 1);
      if (!res.ok) {
        setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: s.isActive } : x)));
        toast({ variant: "destructive", title: "Could not update source status", description: res.message });
      }
    } catch {
      setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: s.isActive } : x)));
      toast({ variant: "destructive", title: "Could not update source status", description: "We couldn't reach the server. Please try again." });
    }
  }

  async function rename(s: Source) {
    const name = window.prompt("Rename source", s.name)?.trim();
    if (!name || name === s.name) return;
    setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, name } : x)));
    try {
      const res = await renameSourceAction(s.id, name);
      if (!res.ok) {
        setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: s.name } : x)));
        toast({ variant: "destructive", title: "Could not rename source", description: res.message });
        return;
      }
      toast({ title: "Source renamed" });
    } catch {
      setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: s.name } : x)));
      toast({ variant: "destructive", title: "Could not rename source", description: "We couldn't reach the server. Please try again." });
    }
  }

  async function remove(s: Source) {
    if (!confirm(`Delete source "${s.name}"? Existing leads are kept but un-sourced.`)) return;
    const prev = sources;
    setSources((p) => p.filter((x) => x.id !== s.id));
    try {
      const res = await deleteSourceAction(s.id);
      if (!res.ok) {
        setSources(prev);
        toast({ variant: "destructive", title: "Could not delete source", description: res.message });
        return;
      }
      toast({ title: "Source deleted" });
    } catch {
      setSources(prev);
      toast({ variant: "destructive", title: "Could not delete source", description: "We couldn't reach the server. Please try again." });
    }
  }

  return (
    <div className="space-y-8">
      {/* Header & Security Badge */}
      <div className="flex items-center justify-between bg-secondary text-foreground p-6 rounded-2xl">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" /> Multi-Source Lead Integration Hub
          </h3>
          <p className="text-sm text-foreground mt-1">
            Connect ad accounts & webhooks. Leads are instantly pulled, mapped, and allocated to your tenant users.
          </p>
        </div>
        <Badge variant="outline" className="text-muted-foreground border-border/30 bg-secondary/40 py-1.5 px-3">
          10,000 req/sec Zero Breakdown Queue
        </Badge>
      </div>

      {/* Hosted Web Form — create a no-code capture form on your own /f/<id> URL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-2xl p-5 bg-card">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl border bg-muted"><FileText className="h-6 w-6 text-violet-500" /></div>
          <div>
            <h5 className="font-bold text-foreground">Hosted Web Form</h5>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-prose">
              Create a ready-to-share form that captures name, email, phone and a message straight
              into your pipeline — no code. After creating it, copy the hosted link or iframe embed
              from the list below.
            </p>
          </div>
        </div>
        <Button onClick={createWebForm} disabled={creatingForm} className="gap-2 rounded-2xl shrink-0">
          <Plus className="h-4 w-4" /> {creatingForm ? "Creating…" : "Create Web Form"}
        </Button>
      </div>

      {/* Platform Cards Section */}
      <div>
        <h4 className="text-base font-semibold text-foreground mb-4">Available Integration Platforms</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLATFORMS.map((platform) => {
            const IconComponent = platform.icon;
            const isConnected = sources.some((s) => s.type === platform.typeKey && s.isActive === 1);

            return (
              <div
                key={platform.id}
                className="border rounded-2xl p-5 bg-card transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl border ${platform.brandColor}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="text-xs font-medium">
                      {platform.badge}
                    </Badge>
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground flex items-center gap-2">
                      {platform.name}
                      {isConnected && <CheckCircle2 className="h-4 w-4 text-muted-foreground inline" />}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{platform.description}</p>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    onClick={() => handleConnectPlatform(platform)}
                    disabled={connectingId === platform.id}
                    className={`w-full font-medium gap-2 rounded-2xl py-5 ${platform.buttonBg}`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {connectingId === platform.id ? "Connecting..." : platform.buttonText}
                  </Button>
                  <a
                    href={platform.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-muted-foreground flex items-center justify-center gap-1 py-1"
                  >
                    Setup Guide & API Documentation <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connected Sources & Webhook Endpoints */}
      <div className="space-y-4">
        <h4 className="text-base font-semibold text-foreground">Active Tenant Connected Endpoints ({sources.length})</h4>
        {sources.length === 0 ? (
          <div className="text-center py-12 border rounded-2xl bg-card text-muted-foreground space-y-2">
            <Globe className="h-8 w-8 mx-auto text-foreground" />
            <p className="font-medium text-muted-foreground">No active sources connected yet.</p>
            <p className="text-xs text-muted-foreground">Click any platform button above to activate instant lead pulling.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((s) => (
              <div key={s.id} className="border rounded-2xl p-5 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{s.name}</span>
                    <Badge variant="secondary" className="capitalize">
                      {s.type?.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => toggle(s)} className="rounded-2xl">
                      {s.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => rename(s)} title="Rename">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(s)} title="Delete" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm pt-1">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">Instant Webhook Endpoint URL</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate bg-muted border rounded-2xl px-3 py-2 text-xs font-mono text-foreground">
                        {webhookUrl(s)}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => copy(webhookUrl(s), "Webhook URL")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {s.webhookSecret && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-1">
                        HMAC SHA-256 Signing Secret (Header <code>x-hub-signature-256</code>)
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate bg-muted border rounded-2xl px-3 py-2 text-xs font-mono text-foreground">
                          {s.webhookSecret}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => copy(s.webhookSecret!, "Secret")}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {(s.type === "generic_webhook" || s.type === "webform") && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-1">Hosted form &amp; embed code</span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate bg-muted border rounded-2xl px-3 py-2 text-xs font-mono text-foreground">
                          {origin}/f/{s.id}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => copy(`${origin}/f/${s.id}`, "Form URL")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copy(`<iframe src="${origin}/f/${s.id}" style="border:0;width:100%;max-width:480px;height:520px" title="Lead form"></iframe>`, "Embed code")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 rounded-2xl"
                          onClick={() => setEditingFormId((cur) => (cur === s.id ? null : s.id))}
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          {editingFormId === s.id ? "Close" : "Customize fields"}
                        </Button>
                      </div>
                      {editingFormId === s.id && <FormFieldsEditor sourceId={s.id} initialConfig={s.config} />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
