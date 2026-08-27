import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";

type Message = {
  id: string;
  direction: string;
  body: string | null;
  status: string;
  createdAt: Date;
};

// Read receipt tick, matching WhatsApp's own semantics.
function StatusTick({ status }: { status: string }) {
  if (status === "failed") return <AlertCircle className="h-3 w-3 text-red-500" />;
  if (status === "read") return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-slate-400" />;
  if (status === "sent") return <Check className="h-3 w-3 text-slate-400" />;
  return <Clock className="h-3 w-3 text-slate-400" />; // queued
}

export function WhatsAppThread({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <div className="text-center py-8 text-sm text-slate-400">No WhatsApp messages yet.</div>;
  }
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto rounded-lg bg-slate-50 p-3">
      {messages.map((m) => {
        const outbound = m.direction === "outbound";
        return (
          <div key={m.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              outbound ? "bg-green-100 text-slate-800" : "bg-white border text-slate-800"
            }`}>
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                {m.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {outbound && <StatusTick status={m.status} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
