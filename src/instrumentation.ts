// Runs once on server startup. Importing a module with a top-level `new Worker(...)` (or calling
// a worker factory) is what actually starts the BullMQ consumer — a queue on its own has no
// consumer. Everything registered here was previously enqueuing jobs that nothing processed.
export async function register() {
  // Initialize Sentry for whichever runtime this is (safe/dormant until the DSN is set).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Fail fast on a misconfigured environment before anything touches the DB or signs a JWT.
  const { validateEnv } = await import("@/lib/env");
  validateEnv();

  // Event listeners + automation dispatch (lead.created, lead.assigned, status changes …).
  await import("@/lib/events/handlers");

  // Follow-up reminders: producer is FollowUpService → reminderQueue; the consumer lives here.
  await import("@/lib/jobs/workers/reminderWorker");

  // Automation runs: consumer for the automations queue.
  await import("@/lib/jobs/workers/automationWorker");

  // SLA escalation: consumer + a 15-min repeating scan (the scan IS the producer).
  // Lead score decay: consumer + a daily repeating recompute across all orgs.
  // Registering the repeatable schedulers touches Redis; a boot-time hiccup must not crash the
  // web server, so log and continue — the workers reconnect on their own.
  try {
    const { createEscalationWorker, scheduleEscalationScan } = await import("@/lib/jobs/workers/escalationWorker");
    createEscalationWorker();
    await scheduleEscalationScan();

    const { createScoreDecayWorker, scheduleScoreDecayScan } = await import("@/lib/jobs/workers/scoreDecayWorker");
    createScoreDecayWorker();
    await scheduleScoreDecayScan();

    // Sequences: consumer + a 5-min repeating scan that delivers due drip steps.
    const { createSequenceWorker, scheduleSequenceScan } = await import("@/lib/jobs/workers/sequenceWorker");
    createSequenceWorker();
    await scheduleSequenceScan();

    // Recycle bin: consumer + a daily scan that permanently purges leads deleted 30+ days ago.
    const { createRecycleBinWorker, scheduleRecycleBinScan } = await import("@/lib/jobs/workers/recycleBinWorker");
    createRecycleBinWorker();
    await scheduleRecycleBinScan();

    // Outbound webhooks: consumer that POSTs signed lead-event payloads to org endpoints, with
    // BullMQ retry/backoff. Producer is the event bus (lead.created / lead.status_changed).
    const { createWebhookRetryWorker } = await import("@/lib/jobs/workers/webhookRetryWorker");
    createWebhookRetryWorker();

    // Lead enrichment: consumer for the enrichment queue. Producer is the event bus (lead.created).
    // No-op per job when no provider is configured; the worker still runs cheaply.
    const { createEnrichmentWorker } = await import("@/lib/jobs/workers/enrichmentWorker");
    createEnrichmentWorker();
  } catch (err) {
    console.error("[instrumentation] failed to register repeatable job schedulers:", err);
  }

  // Note: webhookRetryWorker (outbound lead webhooks) is intentionally NOT started — it has no
  // producer or configuration surface yet. It's a speculative feature, not a broken one; wire it
  // when outbound webhook endpoints become a real, configurable feature.
}

// Next.js 15 Observability hook: centrally captures unhandled server exceptions, Server Action errors,
// and route errors for structured production logging without leaking secrets.
export async function onRequestError(
  err: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?: "react-server-components" | "server-rendering";
  }
) {
  console.error(`[Server Exception] ${request.method || "UNKNOWN"} ${request.path || ""} (${context.routeType}):`, {
    message: err?.message,
    digest: err?.digest,
    routePath: context?.routePath,
  });

  // Forward to Sentry (no-op until the DSN is configured).
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
}
