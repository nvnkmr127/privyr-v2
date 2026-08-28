"use client";

import { useState } from "react";
import { Calendar, Clock, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateLeadFollowUpAction } from "@/lib/actions/leads";
import { useToast } from "@/hooks/use-toast";

interface LeadFollowUpControlProps {
  leadId: string;
  nextFollowUpAt?: Date | string | null;
}

export function LeadFollowUpControl({ leadId, nextFollowUpAt }: LeadFollowUpControlProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const currentDate = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
  const isOverdue = currentDate ? currentDate < new Date() : false;

  const handleSetFollowUp = async (targetDate: Date | null) => {
    setLoading(true);
    try {
      await updateLeadFollowUpAction(leadId, targetDate ? targetDate.toISOString() : null);
      toast({
        title: "Follow-up updated",
        description: targetDate ? `Scheduled for ${targetDate.toLocaleDateString()}` : "Follow-up cleared.",
      });
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Failed to update follow-up",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPresetDate = (type: "today" | "tomorrow" | "1week" | "1month" | "someday"): Date => {
    const d = new Date();
    d.setHours(9, 0, 0, 0); // default to 9 AM
    if (type === "tomorrow") d.setDate(d.getDate() + 1);
    else if (type === "1week") d.setDate(d.getDate() + 7);
    else if (type === "1month") d.setMonth(d.getMonth() + 1);
    else if (type === "someday") d.setMonth(d.getMonth() + 3);
    return d;
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-between font-normal h-auto py-2.5 px-4 border ${
              isOverdue
                ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/15"
                : currentDate
                ? "bg-primary/10 border-primary/30 text-foreground hover:bg-primary/15"
                : "bg-background hover:bg-muted text-muted-foreground"
            }`}
            disabled={loading}
          >
            <div className="flex items-center gap-2.5">
              {isOverdue ? (
                <Clock className="h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <Calendar className="h-4 w-4 shrink-0" />
              )}
              <div className="text-left">
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  {isOverdue
                    ? "Follow Up Overdue"
                    : currentDate
                    ? "Next Follow Up"
                    : "Set Follow Up Reminder"}
                </span>
                <span className="text-sm font-medium">
                  {currentDate
                    ? `${currentDate.toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })} at ${currentDate.toLocaleTimeString(undefined, { timeStyle: "short" })}`
                    : "No reminder scheduled"}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1 text-sm" align="start">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Quick Schedules
          </div>

          <button
            onClick={() => handleSetFollowUp(getPresetDate("today"))}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between text-sm"
          >
            <span>Set to today (9:00 AM)</span>
          </button>

          <button
            onClick={() => handleSetFollowUp(getPresetDate("tomorrow"))}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between text-sm"
          >
            <span>Set to tomorrow (9:00 AM)</span>
          </button>

          <button
            onClick={() => handleSetFollowUp(getPresetDate("1week"))}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between text-sm"
          >
            <span>Set to 1 week from now</span>
          </button>

          <button
            onClick={() => handleSetFollowUp(getPresetDate("1month"))}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between text-sm"
          >
            <span>Set to 1 month from now</span>
          </button>

          <button
            onClick={() => handleSetFollowUp(getPresetDate("someday"))}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between text-sm"
          >
            <span>Set to someday (+3 months)</span>
          </button>

          {currentDate && (
            <div className="border-t pt-1 mt-1">
              <button
                onClick={() => handleSetFollowUp(null)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove follow up</span>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
