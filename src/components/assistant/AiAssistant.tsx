"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { runAgentAction } from "@/lib/actions/agent";
import { sendWhatsAppAction, sendEmailAction } from "@/lib/actions/messaging";
import { Bot, User, Send, Check, X, Loader2, Sparkles } from "lucide-react";
import type { AgentProposal } from "@/lib/ai/agent";

type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; proposals: AgentProposal[] };

// Domain-smart starter prompts — one tap sends them. Keeps users from facing a blank box.
const SUGGESTIONS = [
  "What should I focus on today?",
  "Show hot leads that have gone cold",
  "Which leads haven't been contacted in 7 days?",
  "Draft a follow-up for my newest lead",
];

export function AiAssistant() {
  const { toast } = useToast();
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const scroller = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    // History = prior turns as plain role/content (drop proposals).
    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [...prev, { role: "user", content: msg }]);
    try {
      const res = await runAgentAction(msg, history);
      setTurns((prev) => [...prev, { role: "assistant", content: res.text || "(no reply)", proposals: res.proposals }]);
    } catch {
      toast({ variant: "destructive", title: "Assistant failed", description: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function approve(turnIdx: number, propIdx: number, p: AgentProposal) {
    const res =
      p.channel === "whatsapp"
        ? await sendWhatsAppAction({ leadId: p.leadId, body: p.body })
        : await sendEmailAction({ leadId: p.leadId, subject: `Message for ${p.leadName ?? "you"}`, body: p.body });
    const okResult = res && "ok" in res && res.ok;
    if (okResult) {
      toast({ title: `Sent to ${p.leadName ?? "lead"}` });
      dismiss(turnIdx, propIdx);
    } else {
      toast({ variant: "destructive", title: "Send failed", description: (res as { message?: string })?.message ?? "Unknown error" });
    }
  }

  function dismiss(turnIdx: number, propIdx: number) {
    setTurns((prev) =>
      prev.map((t, i) =>
        i === turnIdx && t.role === "assistant"
          ? { ...t, proposals: t.proposals.filter((_, j) => j !== propIdx) }
          : t,
      ),
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scroller} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {turns.length === 0 && (
          <div className="py-10 space-y-4">
            <div className="text-center text-sm text-muted-foreground space-y-1.5">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">Your CRM assistant</p>
              <p>Triage, tag, remind, or draft outreach across your leads.</p>
            </div>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm rounded-xl border border-border bg-card px-3.5 py-2.5 hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={`flex gap-3 ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            {t.role === "assistant" && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] space-y-3 ${t.role === "user" ? "order-1" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  t.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {t.content}
              </div>

              {t.role === "assistant" &&
                t.proposals.map((p, j) => (
                  <div key={j} className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Draft {p.channel} → {p.leadName ?? "lead"} · needs your approval
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{p.body}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approve(i, j, p)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve &amp; send
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => dismiss(i, j)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
            {t.role === "user" && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center order-2">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl px-4 py-2.5 bg-muted">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about your leads…"
          className="resize-none min-h-[44px] max-h-32"
          rows={1}
        />
        <Button onClick={() => send()} disabled={busy || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
