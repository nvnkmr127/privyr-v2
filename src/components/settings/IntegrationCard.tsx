import * as React from "react";
import { Badge } from "@/components/ui/badge";

type Status = "connected" | "configured" | "unconfigured";

const STATUS: Record<Status, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent" },
  configured: { label: "Available", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-transparent" },
  unconfigured: { label: "Not configured", className: "bg-muted text-muted-foreground border-transparent" },
};

// Presentational card for one integration. `action` is the connect/disconnect/manage control.
export function IntegrationCard({
  name,
  description,
  icon,
  status,
  action,
  docsHint,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: Status;
  action?: React.ReactNode;
  docsHint?: string;
}) {
  const s = STATUS[status];
  return (
    <div className="flex flex-col justify-between rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{name}</span>
            <Badge variant="outline" className={s.className}>{s.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{status === "unconfigured" ? docsHint : ""}</span>
        <div className="ml-auto">{action}</div>
      </div>
    </div>
  );
}
