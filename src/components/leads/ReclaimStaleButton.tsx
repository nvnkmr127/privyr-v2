"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { reclaimStaleLeadsAction } from "@/lib/actions/staleLeads";
import { Flag } from "lucide-react";

export function ReclaimStaleButton({ days }: { days: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function reclaim() {
    setPending(true);
    try {
      const { reclaimedCount } = await reclaimStaleLeadsAction(days);
      toast({
        title: reclaimedCount ? `Escalated ${reclaimedCount} cold leads` : "Nothing to escalate",
        description: reclaimedCount ? "Priority set to High and re-engagement logged." : undefined,
      });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Couldn't escalate cold leads" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={reclaim} disabled={pending} variant="default" size="sm">
      <Flag className="h-4 w-4" /> {pending ? "Escalating…" : "Escalate all to High"}
    </Button>
  );
}
