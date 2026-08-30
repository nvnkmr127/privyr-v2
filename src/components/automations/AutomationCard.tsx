"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Power, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { toggleAutomation, deleteAutomation } from "@/lib/actions/automations";

export function AutomationCard({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [active, setActive] = React.useState(isActive);

  async function toggle() {
    setBusy(true);
    try {
      await toggleAutomation(id, !active);
      setActive(!active);
      toast({ title: !active ? "Automation activated" : "Automation paused" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Couldn't update" });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete automation "${name}"?`)) return;
    setBusy(true);
    try {
      await deleteAutomation(id);
      toast({ title: "Automation deleted" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Couldn't delete" });
      setBusy(false);
    }
  }

  return (
    <div className="border p-4 rounded-lg flex items-center justify-between">
      <div>
        <h3 className="font-medium">{name}</h3>
        <Badge variant={active ? "default" : "secondary"} className="mt-1 font-normal">
          {active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={toggle} disabled={busy} className="gap-1.5">
          <Power className={`h-4 w-4 ${active ? "text-emerald-500" : "text-muted-foreground"}`} />
          {active ? "Pause" : "Activate"}
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link href={`/automations/${id}/edit`}><Pencil className="h-4 w-4" /></Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} disabled={busy} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
