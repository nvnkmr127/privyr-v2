"use client"
import * as React from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { changeLeadStatusAction } from "@/lib/actions/leads"

type Card = { id: string; name: string; email: string | null; phone: string | null; status: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "unqualified", label: "Unqualified" },
];

export function KanbanBoard({ initialLeads }: { initialLeads: Card[] }) {
  const { toast } = useToast();
  const [leads, setLeads] = React.useState<Card[]>(initialLeads);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);

  async function drop(status: string) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const card = leads.find((l) => l.id === id);
    if (!card || card.status === status) return;

    const prev = card.status;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l))); // optimistic
    try {
      await changeLeadStatusAction(id, status);
    } catch {
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: prev } : l)));
      toast({ variant: "destructive", title: "Could not move lead" });
    }
  }

  return (
    <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const cards = leads.filter((l) => l.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
            onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
            onDrop={() => drop(col.key)}
            className={`flex w-72 shrink-0 flex-col rounded-xl border bg-slate-50 ${
              overCol === col.key ? "ring-2 ring-blue-400" : ""
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="text-xs text-slate-400">{cards.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {cards.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  className="rounded-lg border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing"
                >
                  <Link href={`/leads/${c.id}`} className="font-medium text-sm hover:underline">{c.name}</Link>
                  <div className="mt-1 text-xs text-slate-500 truncate">{c.email || c.phone || "—"}</div>
                </div>
              ))}
              {cards.length === 0 && <div className="py-6 text-center text-xs text-slate-400">Drop here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
