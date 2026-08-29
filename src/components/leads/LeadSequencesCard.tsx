"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitFork, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { enrollLeadsAction } from "@/lib/actions/sequences";

interface SequenceOption {
  id: string;
  name: string;
}
interface EnrolledSequence {
  enrollmentId: string;
  sequenceId: string;
  name: string;
  status: string;
}

interface LeadSequencesCardProps {
  leadId: string;
  availableSequences?: SequenceOption[];
  initialEnrolled?: EnrolledSequence[];
}

export function LeadSequencesCard({ leadId, availableSequences = [], initialEnrolled = [] }: LeadSequencesCardProps) {
  const [enrolled, setEnrolled] = useState<EnrolledSequence[]>(initialEnrolled);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const activeIds = new Set(enrolled.filter((e) => e.status === "active").map((e) => e.sequenceId));

  async function handleEnroll(seq: SequenceOption) {
    if (activeIds.has(seq.id)) return;
    setPending(seq.id);
    try {
      const { enrolled: n } = await enrollLeadsAction(seq.id, [leadId]);
      if (n > 0) {
        setEnrolled((cur) => [...cur, { enrollmentId: "new", sequenceId: seq.id, name: seq.name, status: "active" }]);
        toast({ title: "Enrolled in sequence", description: `Lead added to '${seq.name}'.` });
        router.refresh();
      } else {
        toast({ title: "Already enrolled", description: `Lead is already in '${seq.name}'.` });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't enroll", description: e?.message });
    } finally {
      setPending(null);
    }
  }

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
              <DialogTitle>Enroll in a sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-3">
              {availableSequences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sequences yet.{" "}
                  <Link href="/sequences" className="text-primary underline-offset-2 hover:underline">Create one →</Link>
                </p>
              ) : (
                availableSequences.map((seq) => {
                  const isEnrolled = activeIds.has(seq.id);
                  return (
                    <div key={seq.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                      <p className="font-medium text-sm">{seq.name}</p>
                      <Button
                        size="sm"
                        variant={isEnrolled ? "secondary" : "default"}
                        disabled={isEnrolled || pending === seq.id}
                        onClick={() => handleEnroll(seq)}
                        className="h-8 text-xs"
                      >
                        {isEnrolled ? (<><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Enrolled</>) : pending === seq.id ? "Enrolling…" : "Enroll"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {enrolled.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed rounded-lg bg-muted/20 space-y-2">
          <GitFork className="h-8 w-8 text-muted-foreground/60 mx-auto stroke-[1.5]" />
          <p className="text-sm font-medium text-foreground">Not currently part of any sequences</p>
          <p className="text-xs text-muted-foreground">Tap &apos;+ Add to Sequence&apos; to start automated follow-ups.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {enrolled.map((seq) => (
            <div key={seq.enrollmentId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-medium">{seq.name}</span>
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{seq.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
