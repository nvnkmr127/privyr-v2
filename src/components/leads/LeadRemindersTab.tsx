"use client";

import { useState } from "react";
import { Calendar, Clock, Plus, CheckCircle2, Circle, Trash2, Bell, AlertCircle, Phone, Mail, MessageSquare, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReminderAction, toggleReminderStatusAction, deleteReminderAction } from "@/lib/actions/reminders";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ReminderItem {
  id: string;
  leadId: string;
  type: string;
  title: string;
  description?: string | null;
  status: string;
  dueAt: Date | string;
  completedAt?: Date | string | null;
  createdAt: Date | string;
}

interface LeadRemindersTabProps {
  leadId: string;
  initialReminders: ReminderItem[];
}

export function LeadRemindersTab({ leadId, initialReminders }: LeadRemindersTabProps) {
  const [reminders, setReminders] = useState<ReminderItem[]>(initialReminders);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("followup");
  const [dueDate, setDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const newReminder = await createReminderAction({
        leadId,
        title,
        description,
        type,
        dueAt: new Date(dueDate),
      });

      setReminders((prev) => [newReminder as ReminderItem, ...prev]);
      setTitle("");
      setDescription("");
      setShowAdd(false);
      toast({
        title: "Reminder created",
        description: `Scheduled for ${new Date(dueDate).toLocaleString()}`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to create reminder",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const updated = await toggleReminderStatusAction(id, leadId, newStatus);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus, completedAt: newStatus === "completed" ? new Date() : null } : r))
      );
      toast({
        title: newStatus === "completed" ? "Reminder completed" : "Reminder reopened",
      });
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminderAction(id, leadId);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Reminder deleted" });
    } catch (err: any) {
      toast({
        title: "Failed to delete reminder",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "call":
        return <Phone className="h-4 w-4 text-emerald-500" />;
      case "email":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "meeting":
        return <Video className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-amber-500" />;
    }
  };

  const pendingReminders = reminders.filter((r) => r.status !== "completed");
  const completedReminders = reminders.filter((r) => r.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Lead Reminders & Tasks</h4>
          <p className="text-xs text-muted-foreground">Schedule follow-ups, calls, and meetings for this lead</p>
        </div>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            Add Reminder
          </Button>
        )}
      </div>

      {/* Add Reminder Form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="border rounded-2xl p-4 bg-muted/30 space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Reminder</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="h-7 text-xs">
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Title *</label>
              <Input
                placeholder="e.g. Call lead to follow up on quote"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Due Date & Time *</label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Note / Description (Optional)</label>
              <Input
                placeholder="Additional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !title.trim()} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Save Reminder
            </Button>
          </div>
        </form>
      )}

      {/* Pending Reminders */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Pending ({pendingReminders.length})
        </h5>

        {pendingReminders.length === 0 ? (
          <div className="text-center py-8 border rounded-2xl bg-card text-muted-foreground text-xs space-y-1">
            <p className="font-medium text-foreground">No pending reminders</p>
            <p>Schedule a reminder using the button above to stay on top of follow-ups.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingReminders.map((reminder) => {
              const due = new Date(reminder.dueAt);
              const isOverdue = due < new Date();
              return (
                <div
                  key={reminder.id}
                  className={`flex items-start justify-between p-3.5 rounded-2xl border bg-card transition-all hover:border-primary/40 ${
                    isOverdue ? "border-destructive/30 bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggle(reminder.id, reminder.status)}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeIcon(reminder.type)}
                        <span className="font-semibold text-sm text-foreground truncate">{reminder.title}</span>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {due.toLocaleDateString(undefined, { dateStyle: "medium" })} at{" "}
                          {due.toLocaleTimeString(undefined, { timeStyle: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(reminder.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Reminders */}
      {completedReminders.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed ({completedReminders.length})
          </h5>
          <div className="space-y-2">
            {completedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 rounded-2xl border bg-muted/20 opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggle(reminder.id, reminder.status)}
                    className="text-emerald-500 hover:text-muted-foreground transition-colors shrink-0"
                  >
                    <CheckCircle2 className="h-5 w-5 fill-emerald-500/10" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm text-foreground line-through line-clamp-1">{reminder.title}</span>
                    <span className="text-[11px] text-muted-foreground block">
                      Completed {reminder.completedAt ? new Date(reminder.completedAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(reminder.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
