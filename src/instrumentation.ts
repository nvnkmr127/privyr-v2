// Runs once on server startup. Imports the event handlers module so its eventBus.on(...)
// listeners actually register — without this, every emitted domain event (lead.created,
// lead.assigned, status changes) has no listener: automations, activity logging, and
// new-lead notifications all silently no-op.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/events/handlers");
  }
}
