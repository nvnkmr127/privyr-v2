"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSavedViewAction } from "@/lib/actions/savedViews";
import { FilterGroup, FilterRule } from "@/domains/savedViews/service";
import { useToast } from "@/hooks/use-toast";

export function SaveViewDialog({
  open,
  onOpenChange,
  filters,
  sortField,
  sortOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterGroup | FilterRule[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSaved?: (viewId: string) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setBusy(true);
    try {
      const view = await createSavedViewAction({
        name: name.trim(),
        filters,
        sortField,
        sortOrder,
      });
      toast({ title: "Saved view created", description: `"${view.name}" is now available.` });
      setName("");
      onOpenChange(false);
      onSaved?.(view.id);
    } catch {
      toast({ variant: "destructive", title: "Failed to save view" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Current View</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              placeholder="e.g., High Priority Web Leads"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Saving..." : "Save View"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
