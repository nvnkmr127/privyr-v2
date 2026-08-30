"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitPublicLeadAction } from "@/lib/actions/publicLead";

export function PublicLeadForm({ sourceId, title }: { sourceId: string; title: string }) {
  const [f, setF] = React.useState({ name: "", email: "", phone: "", message: "" });
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.name.trim() || (!f.email.trim() && !f.phone.trim())) {
      setError("Please enter your name and an email or phone number.");
      return;
    }
    setSaving(true);
    try {
      const res = await submitPublicLeadAction(sourceId, f);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDone(true);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Thanks, {f.name.split(" ")[0] || "there"}!</h1>
        <p className="text-sm text-muted-foreground">We&apos;ve received your details and will be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">Leave your details and we&apos;ll get back to you.</p>
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      <Input placeholder="Your name *" value={f.name} onChange={(e) => set("name", e.target.value)} />
      <Input type="email" placeholder="Email" value={f.email} onChange={(e) => set("email", e.target.value)} />
      <Input type="tel" placeholder="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
      <Textarea placeholder="How can we help? (optional)" value={f.message} onChange={(e) => set("message", e.target.value)} />
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Sending…" : "Submit"}
      </Button>
    </form>
  );
}
