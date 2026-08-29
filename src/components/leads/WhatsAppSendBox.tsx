"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { sendWhatsAppAction, listTemplates } from "@/lib/actions/messaging"
import { draftLeadReplyAction } from "@/lib/actions/ai"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Sparkles } from "lucide-react"

type Template = { id: string; name: string; body: string };

export function WhatsAppSendBox({ leadId, hasPhone }: { leadId: string; hasPhone: boolean }) {
  const { toast } = useToast();
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [drafting, setDrafting] = React.useState(false);

  // Load WhatsApp templates once for the one-tap picker.
  React.useEffect(() => {
    listTemplates("whatsapp").then((rows) => setTemplates(rows as Template[])).catch(() => {});
  }, []);

  function pickTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (t) setBody(t.body);
  }

  async function draft() {
    setDrafting(true);
    try {
      const { draft, ai } = await draftLeadReplyAction({ leadId });
      setBody(draft);
      toast({ title: ai ? "AI draft ready" : "Draft ready", description: "Review and edit before sending." });
    } catch {
      toast({ variant: "destructive", title: "Couldn't draft a message" });
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    setSending(true);
    try {
      await sendWhatsAppAction({ leadId, body });
      toast({ title: "WhatsApp sent", description: "Message delivered to Watxio." });
      setBody("");
    } catch (err: any) {
      // Surfaces the 24h-window error verbatim so the user knows a template is required.
      toast({ variant: "destructive", title: "Not sent", description: err?.message ?? "Send failed." });
    } finally {
      setSending(false);
    }
  }

  if (!hasPhone) {
    return <div className="text-sm text-muted-foreground">Add a phone number to message this lead on WhatsApp.</div>;
  }

  return (
    <div className="space-y-3">
      {templates.length > 0 && (
        <Select onValueChange={pickTemplate}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Insert a template…" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Textarea
        placeholder="Type a WhatsApp message… tokens like {{first_name}} are filled in automatically."
        className="min-h-[100px]"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-between">
        <Button variant="outline" onClick={draft} disabled={drafting || sending} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {drafting ? "Drafting…" : "Draft with AI"}
        </Button>
        <Button onClick={send} disabled={sending || body.trim().length === 0} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          {sending ? "Sending…" : "Send WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
