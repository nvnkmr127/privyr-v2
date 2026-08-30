"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteSequenceAction } from "@/lib/actions/sequences";

export function SequenceRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function remove() {
    if (!confirm(`Delete sequence "${name}"? Active enrollments will stop.`)) return;
    setBusy(true);
    try {
      const res = await deleteSequenceAction(id);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't delete", description: res.message });
        setBusy(false);
        return;
      }
      toast({ title: "Sequence deleted" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Couldn't delete", description: "We couldn't reach the server. Please try again." });
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="icon">
        <Link href={`/sequences/${id}/edit`}><Pencil className="h-4 w-4" /></Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={remove} disabled={busy} className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
