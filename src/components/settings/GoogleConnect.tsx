"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { disconnectGoogleAction } from "@/lib/actions/integrations";
import { Calendar } from "lucide-react";

export function GoogleConnect({ connected, configured }: { connected: boolean; configured: boolean }) {
  const { toast } = useToast();
  const [isConnected, setConnected] = React.useState(connected);

  async function disconnect() {
    try {
      await disconnectGoogleAction();
      setConnected(false);
      toast({ title: "Google Calendar disconnected" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not disconnect", description: e?.message });
    }
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm p-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-blue-600" />
        <div>
          <div className="font-semibold flex items-center gap-2">Google Calendar {isConnected && <Badge>Connected</Badge>}</div>
          <div className="text-sm text-slate-500">Booking requests create events on your calendar automatically.</div>
        </div>
      </div>
      {!configured ? (
        <span className="text-xs text-amber-600">Not configured</span>
      ) : isConnected ? (
        <Button variant="outline" onClick={disconnect}>Disconnect</Button>
      ) : (
        <a href="/api/integrations/google/connect"><Button>Connect</Button></a>
      )}
    </div>
  );
}
