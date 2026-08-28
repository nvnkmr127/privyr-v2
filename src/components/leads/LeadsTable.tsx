"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Download, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { listUsersAction } from "@/lib/actions/users";
import { bulkAssignLeadAction, bulkChangeLeadStatusAction } from "@/lib/actions/leads";
import { bulkAddTagAction } from "@/lib/actions/tags";

type Lead = { id: string; name: string; email: string | null; phone: string | null; status: string; createdAt: Date };
type User = { id: string; name: string };

const STATUSES = ["new", "active", "won", "lost", "unqualified"];

export function LeadsTable({
  leads,
  page = 1,
  pageSize = 20,
  total = 0,
  totalPages = 1,
}: {
  leads: Lead[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [users, setUsers] = React.useState<User[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    listUsersAction().then(setUsers).catch(() => {});
  }, []);

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
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

  function goToPage(newPage: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(newPage));
    router.replace(`/leads?${p.toString()}`);
  }

  function changePageSize(size: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("pageSize", size);
    p.set("page", "1");
    router.replace(`/leads?${p.toString()}`);
  }

  const [tagName, setTagName] = React.useState("");

  function exportSelectedCsv() {
    const selectedLeads = leads.filter((l) => selected.has(l.id));
    if (selectedLeads.length === 0) return;
    const headers = ["ID", "Name", "Phone", "Email", "Status", "Created At"];
    const rows = selectedLeads.map((l) => [
      l.id,
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      l.status,
      l.createdAt ? new Date(l.createdAt).toISOString() : "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `leads_export_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${selectedLeads.length} leads to CSV` });
  }

  const ids = () => Array.from(selected);

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select
            disabled={busy}
            onValueChange={(userId) =>
              run(() => bulkAssignLeadAction({ leadIds: ids(), ownerId: userId, teamId: null }), "Leads assigned")
            }
          >
            <SelectTrigger className="w-48 bg-card">
              <SelectValue placeholder="Assign to…" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            disabled={busy}
            onValueChange={(status) =>
              run(() => bulkChangeLeadStatusAction({ leadIds: ids(), status }), "Status updated")
            }
          >
            <SelectTrigger className="w-44 bg-card">
              <SelectValue placeholder="Set status…" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Add tag..."
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-36 h-9 bg-card text-sm"
              disabled={busy}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !tagName.trim()}
              onClick={() => {
                run(() => bulkAddTagAction(ids(), tagName.trim()), `Tag "${tagName}" added to leads`);
                setTagName("");
              }}
              className="h-9 gap-1"
            >
              <Tag className="h-3.5 w-3.5" />
              Tag
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportSelectedCsv}
            className="h-9 gap-1.5 ml-auto"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all leads on page"
                />
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
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                    aria-label={`Select ${lead.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/leads/${lead.id}`} className="hover:underline text-primary">
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>{lead.email || "-"}</TableCell>
                <TableCell>{lead.phone || "-"}</TableCell>
                <TableCell>
                  <Badge variant={lead.status === "new" ? "default" : "secondary"}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell suppressHydrationWarning>
                  {new Date(lead.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/leads/${lead.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t bg-muted text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={changePageSize}>
              <SelectTrigger className="h-7 w-16 bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-2 font-medium">
              Showing {startRecord} - {endRecord} of {total} leads
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="mr-2">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-card"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-card"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              aria-label="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
