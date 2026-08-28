"use client";

import { useState } from "react";
import { GitFork, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SequenceOption {
  id: string;
  name: string;
  triggerType?: string;
}

interface LeadSequencesCardProps {
  leadId: string;
  availableSequences?: SequenceOption[];
}

export function LeadSequencesCard({ leadId, availableSequences = [] }: LeadSequencesCardProps) {
  const [enrolledSequences, setEnrolledSequences] = useState<SequenceOption[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleEnroll = (seq: SequenceOption) => {
    if (enrolledSequences.some((s) => s.id === seq.id)) return;
    setEnrolledSequences([...enrolledSequences, seq]);
    toast({
      title: "Enrolled in Sequence",
      description: `Lead added to '${seq.name}'.`,
    });
    setOpen(false);
  };

  return (
    <div className="border rounded-2xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <GitFork className="h-4 w-4" /> Sequences
        </h3>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 font-medium text-primary">
              <Plus className="h-3.5 w-3.5" /> Add to Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enroll in Drip Sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-3">
              {availableSequences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active sequence templates configured yet.
                </p>
              ) : (
                availableSequences.map((seq) => {
                  const isEnrolled = enrolledSequences.some((s) => s.id === seq.id);
                  return (
                    <div
                      key={seq.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{seq.name}</p>
                        <span className="text-xs text-muted-foreground capitalize">
                          Trigger: {seq.triggerType || "Manual"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={isEnrolled ? "secondary" : "default"}
                        disabled={isEnrolled}
                        onClick={() => handleEnroll(seq)}
                        className="h-8 text-xs"
                      >
                        {isEnrolled ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Enrolled
                          </>
                        ) : (
                          "Enroll"
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {enrolledSequences.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed rounded-lg bg-muted/20 space-y-2">
          <GitFork className="h-8 w-8 text-muted-foreground/60 mx-auto stroke-[1.5]" />
          <p className="text-sm font-medium text-foreground">Not currently part of any sequences</p>
          <p className="text-xs text-muted-foreground">
            Tap the &apos;+ Add to Sequence&apos; button above to start automated follow-ups.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {enrolledSequences.map((seq) => (
            <div
              key={seq.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-medium">{seq.name}</span>
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Active
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
