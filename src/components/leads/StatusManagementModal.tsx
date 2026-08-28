"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getTenantStatusSchemaAction,
  addOrUpdateStatusAction,
  deleteCustomStatusAction,
  getStatusDurationAnalyticsAction,
} from "@/lib/actions/customStatuses";
import { CustomStatusItem, StatusCategory } from "@/domains/leads/customStatusSchemaService";
import { StatusDurationMetric } from "@/domains/leads/leadStatusService";

const CATEGORIES: { value: StatusCategory; label: string }[] = [
  { value: "open", label: "Open / New" },
  { value: "in_progress", label: "In Progress" },
  { value: "won", label: "Closed Won" },
  { value: "lost", label: "Closed Lost" },
  { value: "unqualified", label: "Unqualified" },
];

export function StatusManagementModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [statuses, setStatuses] = React.useState<CustomStatusItem[]>([]);
  const [metrics, setMetrics] = React.useState<StatusDurationMetric[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"statuses" | "analytics">("statuses");

  // Form states
  const [newKey, setNewKey] = React.useState("");
  const [newLabel, setNewLabel] = React.useState("");
  const [newColor, setNewColor] = React.useState("#3B82F6");
  const [newCategory, setNewCategory] = React.useState<StatusCategory>("open");
  const [saving, setSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [schemaData, analyticsData] = await Promise.all([
        getTenantStatusSchemaAction(),
        getStatusDurationAnalyticsAction(),
      ]);
      setStatuses(schemaData);
      setMetrics(analyticsData);
    } catch {
      toast({ variant: "destructive", title: "Failed to load status schema" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  async function handleAddStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const key = newKey.trim() || newLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    setSaving(true);
    try {
      await addOrUpdateStatusAction({
        key,
        label: newLabel.trim(),
        color: newColor,
        category: newCategory,
      });
      toast({ title: "Status saved", description: `"${newLabel}" status updated successfully.` });
      setNewKey("");
      setNewLabel("");
      loadData();
    } catch {
      toast({ variant: "destructive", title: "Could not save custom status" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(key: string) {
    try {
      await deleteCustomStatusAction(key);
      toast({ title: "Status deleted" });
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Failed to delete status" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Lead Status Schema & Analytics</DialogTitle>
          <DialogDescription>
            Configure custom tenant lead status taxonomies and review stage duration metrics.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 my-3 gap-4">
          <button
            type="button"
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "statuses"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("statuses")}
          >
            Custom Status Schema
          </button>
          <button
            type="button"
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "analytics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("analytics")}
          >
            Stage Duration Analytics
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading status configuration...</div>
        ) : activeTab === "statuses" ? (
          <div className="space-y-6">
            {/* Status list */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Statuses</h4>
              <div className="grid grid-cols-1 gap-2">
                {statuses.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {item.label}{" "}
                          <span className="text-xs text-gray-400">({item.key})</span>
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          Category: {item.category.replace("_", " ")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.isSystemDefault ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                          System Default
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-xs"
                          onClick={() => handleDelete(item.key)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add custom status form */}
            <form onSubmit={handleAddStatus} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Add / Update Status
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="status-label" className="text-xs">Display Label</Label>
                  <Input
                    id="status-label"
                    placeholder="e.g. Negotiation"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="status-key" className="text-xs">System Key (Optional)</Label>
                  <Input
                    id="status-key"
                    placeholder="e.g. negotiation"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="status-category" className="text-xs">Category</Label>
                  <Select value={newCategory} onValueChange={(val) => setNewCategory(val as StatusCategory)}>
                    <SelectTrigger id="status-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="status-color" className="text-xs">Badge Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="status-color"
                      type="color"
                      className="w-12 h-9 p-1 cursor-pointer"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                    />
                    <Input
                      type="text"
                      className="text-xs font-mono"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={saving || !newLabel.trim()} className="w-full">
                {saving ? "Saving Status..." : "Save Status Configuration"}
              </Button>
            </form>
          </div>
        ) : (
          /* Analytics Tab */
          <div className="space-y-4 py-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Average Stage Residence Duration
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.status}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800"
                >
                  <div>
                    <div className="font-semibold text-sm capitalize">{m.status}</div>
                    <div className="text-xs text-gray-500">{m.leadCount} lead transitions evaluated</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {m.averageDurationHours} hrs avg
                    </div>
                    <div className="text-xs text-gray-400">{m.medianDurationHours} hrs median</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
