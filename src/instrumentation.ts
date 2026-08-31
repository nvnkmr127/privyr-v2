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

  // Background workers need a real Redis and an always-on process. On a serverless web deploy
  // (Vercel) leave REDIS_URL unset here and run the workers separately (src/worker.ts, `npm run
  // worker`); startWorkers() no-ops when REDIS_URL is absent. On a single long-lived Node server,
  // setting REDIS_URL runs them in-process. A boot-time hiccup must not crash the web server.
  try {
    const { startWorkers } = await import("@/lib/jobs/startWorkers");
    await startWorkers();
  } catch (err) {
    console.error("[instrumentation] failed to start background workers:", err);
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
