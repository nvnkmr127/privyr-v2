"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from "@/lib/actions/messaging";
import { Mail } from "lucide-react";

export function EmailSendBox({ leadId, email }: { leadId: string; email: string | null }) {
  const { toast } = useToast();
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  if (!email) return <div className="text-sm text-muted-foreground">This lead has no email address.</div>;

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await sendEmailAction({ leadId, subject: subject.trim(), body: body.trim() });
      setSubject(""); setBody("");
      toast({ title: "Email sent", description: `Sent to ${email}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not send", description: e?.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">To: <span className="font-medium text-muted-foreground">{email}</span></div>
      <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea
        placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} rows={6}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex justify-end">
        <Button onClick={send} disabled={sending || !subject.trim() || !body.trim()} className="gap-2">
          <Mail className="h-4 w-4" />{sending ? "Sending…" : "Send email"}
        </Button>
      </div>
    </div>
  );
}
