"use client";

import { useState } from "react";
import { Phone, Mail, MessageSquare, Calendar, Clock, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickResponseDialog } from "@/components/leads/QuickResponseDialog";
import { EditLeadDialog } from "@/components/leads/EditLeadDialog";
import { DeleteLeadButton } from "@/components/leads/DeleteLeadButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { updateLeadFollowUpAction } from "@/lib/actions/leads";
import { useToast } from "@/hooks/use-toast";

interface LeadHeaderQuickActionsProps {
  lead: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    nextFollowUpAt?: Date | string | null;
  };
  onTabSelect?: (tab: string) => void;
}

export function LeadHeaderQuickActions({ lead }: LeadHeaderQuickActionsProps) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const phoneClean = lead.phone ? lead.phone.replace(/[^0-9+]/g, "") : "";
  const waUrl = phoneClean ? `https://wa.me/${phoneClean.replace("+", "")}` : "";

  const currentDate = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
  const isOverdue = currentDate ? currentDate < new Date() : false;

  const handleSetFollowUp = async (targetDate: Date | null) => {
    setLoading(true);
    try {
      const res = await updateLeadFollowUpAction(lead.id, targetDate ? targetDate.toISOString() : null);
      if (!res.ok) {
        toast({ title: "Failed to update follow-up", description: res.message, variant: "destructive" });
        return;
      }
      toast({
        title: "Follow-up updated",
        description: targetDate ? `Scheduled for ${targetDate.toLocaleDateString()}` : "Follow-up cleared.",
      });
      setReminderOpen(false);
    } catch {
      toast({
        title: "Failed to update follow-up",
        description: "We couldn't reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPresetDate = (type: "today" | "tomorrow" | "1week" | "1month"): Date => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    if (type === "tomorrow") d.setDate(d.getDate() + 1);
    else if (type === "1week") d.setDate(d.getDate() + 7);
    else if (type === "1month") d.setMonth(d.getMonth() + 1);
    return d;
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            {lead.phone ? (
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs font-medium" asChild>
                <a href={`tel:${phoneClean}`}>
                  <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Call</span>
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs font-medium opacity-50 cursor-not-allowed" disabled>
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Call</span>
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>{lead.phone ? `Call ${lead.phone}` : "No phone number available"}</TooltipContent>
        </Tooltip>

        {/* Quick WhatsApp */}
        <Tooltip>
          <TooltipTrigger asChild>
            {waUrl ? (
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs font-medium" asChild>
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs font-medium opacity-50 cursor-not-allowed" disabled>
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>{lead.phone ? `Open WhatsApp chat` : "No phone number available"}</TooltipContent>
        </Tooltip>

        {/* Quick Email */}
        <Tooltip>
          <TooltipTrigger asChild>
            {lead.email ? (
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs font-medium" asChild>
                <a href={`mailto:${lead.email}`}>
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  <span className="hidden sm:inline">Email</span>
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs font-medium opacity-50 cursor-not-allowed" disabled>
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Email</span>
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>{lead.email ? `Email ${lead.email}` : "No email address available"}</TooltipContent>
        </Tooltip>

        {/* Quick Reminder Popover */}
        <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 px-3 gap-1.5 text-xs font-medium border ${
                    isOverdue
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : currentDate
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : ""
                  }`}
                  disabled={loading}
                >
                  {isOverdue ? (
                    <Clock className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span>{currentDate ? "Reminder" : "Remind"}</span>
                  <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              {currentDate
                ? `Next follow-up: ${currentDate.toLocaleDateString()}`
                : "Schedule quick follow-up reminder"}
            </TooltipContent>
          </Tooltip>

          <PopoverContent className="w-56 p-2 space-y-1 text-xs" align="end">
            <div className="font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 text-[10px]">
              Set Follow-up
            </div>

            <button
              onClick={() => handleSetFollowUp(getPresetDate("today"))}
              className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>Today (9:00 AM)</span>
            </button>
            <button
              onClick={() => handleSetFollowUp(getPresetDate("tomorrow"))}
              className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>Tomorrow (9:00 AM)</span>
            </button>
            <button
              onClick={() => handleSetFollowUp(getPresetDate("1week"))}
              className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>In 1 Week</span>
            </button>
            <button
              onClick={() => handleSetFollowUp(getPresetDate("1month"))}
              className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>In 1 Month</span>
            </button>

            {currentDate && (
              <div className="border-t pt-1 mt-1">
                <button
                  onClick={() => handleSetFollowUp(null)}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear Reminder</span>
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Quick Response Dialog */}
        <QuickResponseDialog
          leadId={lead.id}
          leadName={lead.name}
          email={lead.email}
          phone={lead.phone}
        />

        {/* Edit Lead Dialog */}
        <EditLeadDialog lead={lead} />

        {/* Delete → recycle bin */}
        <DeleteLeadButton leadId={lead.id} leadName={lead.name} />
      </div>
    </TooltipProvider>
  );
}
