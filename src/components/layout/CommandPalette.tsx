"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { searchLeadsAction } from "@/lib/actions/search";
import { Search, Users, LayoutGrid, CalendarClock, Settings } from "lucide-react";

type Lead = { id: string; name: string; email: string | null; phone: string | null; company: string | null };

const NAV = [
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Kanban", href: "/leads/kanban", icon: LayoutGrid },
  { label: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Debounced lead search.
  React.useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try { setResults(await searchLeadsAction(query)); } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      {/* shouldFilter=false: results come from the server, not cmdk's local fuzzy match. */}
      <CommandInput placeholder="Search leads or jump to…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{loading ? "Searching…" : "No results."}</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Leads">
            {results.map((l) => (
              <CommandItem key={l.id} value={l.id} onSelect={() => go(`/leads/${l.id}`)}>
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <span className="font-medium">{l.name}</span>
                <span className="ml-2 text-xs text-slate-400">{l.email || l.phone || l.company}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Go to">
          {NAV.map((n) => (
            <CommandItem key={n.href} value={`nav ${n.label}`} onSelect={() => go(n.href)}>
              <n.icon className="mr-2 h-4 w-4 text-slate-400" />{n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
