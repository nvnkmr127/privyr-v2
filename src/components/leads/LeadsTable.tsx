"use client"
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { listUsersAction } from "@/lib/actions/users"
import { bulkAssignLeadAction, bulkChangeLeadStatusAction } from "@/lib/actions/leads"

type Lead = { id: string; name: string; email: string | null; phone: string | null; status: string; createdAt: Date };
type User = { id: string; name: string };

const STATUSES = ["new", "active", "won", "lost", "unqualified"];

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [users, setUsers] = React.useState<User[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { listUsersAction().then(setUsers).catch(() => {}); }, []);

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast({ title: msg });
      setSelected(new Set());
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Bulk action failed" });
    } finally {
      setBusy(false);
    }
  }

  const ids = () => Array.from(selected);

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-slate-50 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select disabled={busy} onValueChange={(userId) =>
            run(() => bulkAssignLeadAction({ leadIds: ids(), ownerId: userId, teamId: null }), "Leads assigned")}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Assign to…" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select disabled={busy} onValueChange={(status) =>
            run(() => bulkChangeLeadStatusAction({ leadIds: ids(), status }), "Status updated")}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Set status…" /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} data-state={selected.has(lead.id) ? "selected" : undefined}>
                <TableCell>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)}
                    aria-label={`Select ${lead.name}`} />
                </TableCell>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.email || "-"}</TableCell>
                <TableCell>{lead.phone || "-"}</TableCell>
                <TableCell>
                  <Badge variant={lead.status === "new" ? "default" : "secondary"}>{lead.status}</Badge>
                </TableCell>
                <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/leads/${lead.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
