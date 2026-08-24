# Background Jobs Architecture

## 1. Core Stack
- **Broker:** Redis
- **Queue Engine:** BullMQ
- **Workers:** Next.js custom server instances or dedicated Node.js worker processes (depending on deployment infrastructure).

## 2. Why Background Jobs?
Lead Management requires numerous asynchronous operations that should not block the HTTP request cycle:
- **Email Dispatch:** Sending transactional emails or bulk marketing sequences.
- **Lead Routing & Assignment:** Running complex rules (Round-Robin, geographical assignment) upon Lead Capture.
- **Lead Scoring:** Recalculating scores based on recent activities or newly updated fields.
- **Automations / Workflows:** Triggering sequence steps (e.g., "Wait 2 days, then send Email X").
- **Webhooks:** Emitting outgoing webhooks to external integrations when a Lead reaches a specific pipeline stage.

## 3. Queue Topology
Separate queues will be defined based on priority and domain:
- `high-priority`: Immediate lead assignments, transactional emails (e.g., password resets).
- `automation`: Processing workflow steps and delays.
- `bulk`: Bulk imports, large CSV exports.
- `integrations`: External API syncing.

## 4. Error Handling & Retries
- BullMQ will be configured with automatic retry mechanisms and exponential backoff for network-related failures (e.g., failed Webhook delivery).
- A Dead Letter Queue (DLQ) will catch permanently failed jobs for manual inspection by admins.
