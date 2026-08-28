// Runs once on server startup. Importing a module with a top-level `new Worker(...)` (or calling
// a worker factory) is what actually starts the BullMQ consumer — a queue on its own has no
// consumer. Everything registered here was previously enqueuing jobs that nothing processed.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

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
  } catch (err) {
    console.error("[instrumentation] failed to register repeatable job schedulers:", err);
  }

  // Note: webhookRetryWorker (outbound lead webhooks) is intentionally NOT started — it has no
  // producer or configuration surface yet. It's a speculative feature, not a broken one; wire it
  // when outbound webhook endpoints become a real, configurable feature.
}
