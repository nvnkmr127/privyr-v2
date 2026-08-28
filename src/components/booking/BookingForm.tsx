"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { requestMeetingAction } from "@/lib/actions/booking";

export function BookingForm({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [f, setF] = React.useState({ name: "", email: "", phone: "", when: "", message: "" });
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.when || (!f.email && !f.phone)) return;
    setSaving(true);
    try {
      await requestMeetingAction({ slug, ...f });
      setDone(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not book", description: err?.message });
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return <div className="rounded-lg border border-border bg-muted p-6 text-foreground text-sm">Thanks! Your meeting request has been sent. We&apos;ll be in touch shortly.</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1"><Label htmlFor="name">Your name *</Label><Input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="phone">Phone</Label><Input id="phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
      </div>
      <div className="space-y-1"><Label htmlFor="when">Preferred date & time *</Label><Input id="when" type="datetime-local" value={f.when} onChange={(e) => set("when", e.target.value)} required /></div>
      <div className="space-y-1">
        <Label htmlFor="message">Anything we should know?</Label>
        <textarea id="message" rows={3} value={f.message} onChange={(e) => set("message", e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-muted-foreground">Provide at least an email or phone so we can confirm.</p>
      <Button type="submit" className="w-full" disabled={saving || !f.name.trim() || !f.when || (!f.email && !f.phone)}>
        {saving ? "Sending…" : "Request meeting"}
      </Button>
    </form>
  );
}
