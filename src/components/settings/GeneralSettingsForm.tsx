"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateOrganizationAction } from "@/lib/actions/organizations";
import { StatusManagementModal } from "@/components/leads/StatusManagementModal";
import { Sliders, Building, Tag, Users, MessageSquare, Database, Globe } from "lucide-react";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  timezone?: string | null;
  locale?: string | null;
  currency?: string | null;
  dateFormat?: string | null;
  industry?: string | null;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  requiredLeadFields?: string[] | null;
  slaHours?: number | null;
};

const LEAD_FIELDS: { key: string; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "AED", "JPY"];
const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD-MMM-YYYY"];
const LOCALES = ["en", "en-GB", "es", "fr", "de", "pt", "hi", "ar", "zh"];

// A native <select> — no dependency, correct on edge cases, themable via the same classes as Input.
function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

export function GeneralSettingsForm({ organization }: { organization?: Org | null }) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [requiredFields, setRequiredFields] = React.useState<string[]>(
    organization?.requiredLeadFields ?? ["name"],
  );
  const [f, setF] = React.useState({
    name: organization?.name ?? "",
    timezone: organization?.timezone ?? "UTC",
    locale: organization?.locale ?? "en",
    currency: organization?.currency ?? "USD",
    dateFormat: organization?.dateFormat ?? "MM/DD/YYYY",
    industry: organization?.industry ?? "",
    phone: organization?.phone ?? "",
    website: organization?.website ?? "",
    addressLine1: organization?.addressLine1 ?? "",
    city: organization?.city ?? "",
    state: organization?.state ?? "",
    postalCode: organization?.postalCode ?? "",
    country: organization?.country ?? "",
    slaHours: organization?.slaHours != null ? String(organization.slaHours) : "",
  });

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return;
    setSaving(true);
    try {
      await updateOrganizationAction({
        ...f,
        name: f.name.trim(),
        slaHours: f.slaHours === "" ? null : Number(f.slaHours),
        requiredLeadFields: requiredFields as ("name" | "email" | "phone" | "company")[],
      });
      toast({ title: "Settings saved", description: "Organization settings updated successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save settings", description: err?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <StatusManagementModal open={statusModalOpen} onOpenChange={setStatusModalOpen} />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company information */}
        <div className="bg-card dark:bg-secondary rounded-xl border border-border dark:border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border dark:border-border pb-4">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Company Information</h3>
              <p className="text-xs text-muted-foreground">Your organization identity and contact details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Business Name *</Label>
              <Input id="org-name" value={f.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Acme Realty" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={f.industry} onChange={(e) => set("industry", e.target.value)}
                placeholder="e.g. Real Estate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={f.addressLine1} onChange={(e) => set("addressLine1", e.target.value)}
                placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={f.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" value={f.state} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal">Postal Code</Label>
              <Input id="postal" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country (2-letter)</Label>
              <Input id="country" value={f.country} onChange={(e) => set("country", e.target.value.toUpperCase())}
                maxLength={2} placeholder="US" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border dark:border-border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Workspace Slug</Label>
              <div className="text-sm font-mono bg-muted dark:bg-secondary px-3 py-2 rounded-md text-muted-foreground dark:text-foreground">
                {organization?.slug ?? "org-default"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Subscription Plan</Label>
              <div className="text-sm font-medium capitalize bg-muted dark:bg-secondary text-muted-foreground dark:text-foreground px-3 py-2 rounded-md">
                {organization?.plan ?? "free"} Plan
              </div>
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-card dark:bg-secondary rounded-xl border border-border dark:border-border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border dark:border-border pb-4">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Localisation</h3>
              <p className="text-xs text-muted-foreground">Timezone, language, currency, and date formatting for your workspace.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone (IANA)</Label>
              <Input id="timezone" value={f.timezone} onChange={(e) => set("timezone", e.target.value)}
                placeholder="e.g. America/New_York" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Language / Locale</Label>
              <NativeSelect id="locale" value={f.locale} onChange={(e) => set("locale", e.target.value)}>
                {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <NativeSelect id="currency" value={f.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <NativeSelect id="dateFormat" value={f.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}>
                {DATE_FORMATS.map((d) => <option key={d} value={d}>{d}</option>)}
              </NativeSelect>
            </div>
          </div>
        </div>

        {/* Required lead information */}
        <div className="bg-card dark:bg-secondary rounded-xl border border-border dark:border-border p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border dark:border-border pb-4">
            <Sliders className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Required Lead Information</h3>
              <p className="text-xs text-muted-foreground">Fields that must be filled in when a lead is created.</p>
            </div>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="slaHours">SLA escalation (hours)</Label>
            <Input id="slaHours" type="number" min={0} value={f.slaHours}
              onChange={(e) => set("slaHours", e.target.value)} placeholder="e.g. 24 — blank to disable" />
            <p className="text-xs text-muted-foreground">A new lead unactioned this long alerts its owner. Blank = off.</p>
          </div>
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border dark:border-border">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked disabled className="h-4 w-4 rounded border-border" />
              Name (always required)
            </label>
            {LEAD_FIELDS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-muted-foreground dark:text-foreground">
                <input
                  type="checkbox"
                  checked={requiredFields.includes(key)}
                  onChange={(e) =>
                    setRequiredFields((prev) =>
                      e.target.checked ? [...prev, key] : prev.filter((k) => k !== key),
                    )
                  }
                  className="h-4 w-4 rounded border-border"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !f.name.trim()}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>

      {/* Core Lead & Workflow Configuration Card */}
      <div className="bg-card dark:bg-secondary rounded-xl border border-border dark:border-border p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-border dark:border-border pb-4">
          <Sliders className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Lead & Pipeline Management</h3>
            <p className="text-xs text-muted-foreground">Configure status taxonomies, sources, team roles, and message templates.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className="flex items-start gap-3 p-4 rounded-lg border border-border dark:border-border hover:border-border dark:hover:border-border bg-muted dark:bg-secondary text-left transition-all group"
          >
            <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold text-sm group-hover:text-muted-foreground text-foreground dark:text-foreground">
                Lead Status Schema & Analytics
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Custom status badges, category workflows, and stage duration metrics.
              </div>
            </div>
          </button>

          <Link
            href="/settings/sources"
            className="flex items-start gap-3 p-4 rounded-lg border border-border dark:border-border hover:border-border dark:hover:border-border bg-muted dark:bg-secondary text-left transition-all group"
          >
            <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold text-sm group-hover:text-muted-foreground text-foreground dark:text-foreground">
                Lead Sources & Webhooks
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Manage Meta Lead Ads, custom webforms, and integration API secrets.
              </div>
            </div>
          </Link>

          <Link
            href="/settings/templates"
            className="flex items-start gap-3 p-4 rounded-lg border border-border dark:border-border hover:border-border dark:hover:border-border bg-muted dark:bg-secondary text-left transition-all group"
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold text-sm group-hover:text-muted-foreground text-foreground dark:text-foreground">
                WhatsApp Message Templates
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Define pre-approved outreach message templates and auto-replies.
              </div>
            </div>
          </Link>

          <Link
            href="/settings/users"
            className="flex items-start gap-3 p-4 rounded-lg border border-border dark:border-border hover:border-border dark:hover:border-border bg-muted dark:bg-secondary text-left transition-all group"
          >
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold text-sm group-hover:text-muted-foreground text-foreground dark:text-foreground">
                Users, Roles & Teams
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Invite team members, assign RBAC roles, and set sales capacity limits.
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
