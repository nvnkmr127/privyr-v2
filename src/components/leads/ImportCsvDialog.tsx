"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { listSourcesAction } from "@/lib/actions/sources"
import { uploadCsvAction } from "@/lib/actions/csv"
import { validateCsvFile } from "@/lib/csvFile"

type Source = { id: string; name: string };

export function ImportCsvDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [sourceId, setSourceId] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Load sources when the dialog opens — a source is required to attribute imported leads.
  React.useEffect(() => {
    if (open) listSourcesAction().then((r) => setSources(r as Source[])).catch(() => {});
  }, [open]);

  async function submit() {
    if (!sourceId || !file) return;
    const problem = validateCsvFile(file);
    if (problem) {
      toast({ variant: "destructive", title: "Can't import this file", description: problem });
      return;
    }
    setBusy(true);
    try {
      const csvContent = await file.text();
      const res = await uploadCsvAction({ sourceId, csvContent });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Import failed", description: res.message });
        return;
      }
      toast({ title: "Import queued", description: `${res.data.count} rows are being processed — they'll appear shortly.` });
      setOpen(false);
      setFile(null);
      setTimeout(() => router.refresh(), 1500); // let a few rows land, then refresh the list
    } catch {
      toast({ variant: "destructive", title: "Import failed", description: "We couldn't reach the server. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Include <code>name</code>, <code>email</code>, <code>phone</code>, <code>company</code> columns. Up to 5000 rows.
          </DialogDescription>
        </DialogHeader>

        {sources.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            You need a lead source first.{" "}
            <Link href="/settings/sources" className="text-muted-foreground underline">Create one</Link>.
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Attribute to source</label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger><SelectValue placeholder="Select a source…" /></SelectTrigger>
                <SelectContent>
                  {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CSV file</label>
              <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={submit} disabled={busy || !sourceId || !file}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
