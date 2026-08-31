import { validateEnv } from "@/lib/env";
import { startWorkers } from "@/lib/jobs/startWorkers";

// Standalone background-worker process. Deploy this ALONGSIDE (not on) a serverless web app: the
// Vercel web app enqueues jobs, this long-lived process drains them. Run it on any always-on host
// (Railway, Render, Fly, a VM, docker) with the same env as the web app.
//   npm run worker
async function main() {
  validateEnv();

  if (!process.env.REDIS_URL) {
    console.error("[worker] REDIS_URL is required to run background workers. Set it and restart.");
    process.exit(1);
  }

  await startWorkers();
  console.log("[worker] up — draining queues. Ctrl+C to stop.");
  // The BullMQ workers keep the event loop alive; nothing else to do here.
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`[worker] ${sig} received — shutting down.`);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] fatal startup error:", err);
  process.exit(1);
});
