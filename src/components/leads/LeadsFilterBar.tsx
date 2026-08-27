"use client"
import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

const STATUSES = ["all", "new", "active", "won", "lost", "unqualified"];

export function LeadsFilterBar({ search, status }: { search?: string; status?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = React.useState(search ?? "");
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  // Push a param change into the URL; the server component re-queries on navigation.
  function apply(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    router.replace(`/leads?${p.toString()}`);
  }

  function onSearch(value: string) {
    setTerm(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ search: value }), 300); // debounce typing
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name…" value={term} onChange={(e) => onSearch(e.target.value)} className="pl-8" />
      </div>
      <Select value={status ?? "all"} onValueChange={(v) => apply({ status: v === "all" ? "" : v })}>
        <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
