# Privyr v2 — Build Status & Runbook

A mobile-first-style lead CRM (Privyr clone): capture leads fast, alert the owner instantly,
message in one tap. Next.js 15 · Drizzle · Postgres · Redis/BullMQ · NextAuth.

## Run it locally

Requires Postgres + Redis running locally.

```bash
# 1. Env
cp .env.example .env          # fill DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, VAPID keys

# 2. Schema
npx drizzle-kit migrate

# 3. Seed a first admin (roles + a login). Adjust as needed:
#    - insert a row in `roles` (name='admin'), a `users` row with a bcrypt password_hash,
#      and set that user's role_id to the admin role.
#    - generate a hash: node -e "console.log(require('bcryptjs').hashSync('yourpass',10))"

# 4. Dev
npm run dev                   # http://localhost:3000
```

VAPID keys for web-push: `npx web-push generate-vapid-keys` → put public in
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private in `VAPID_PRIVATE_KEY`.

> Don't run `next build` while `next dev` is running — they share `.next` and the build
> corrupts the dev server's chunks (`MODULE_NOT_FOUND`). Stop dev first.

## What's built

**Capture** — manual add · webhook sources (Facebook Lead Ads / generic / web form) · CSV import.
All funnel through one ingestion pipeline (`webhook_events` → BullMQ → adapter → dedupe → lead).

**Route** — auto-assignment on new lead, incl. race-safe round-robin (row-locked transaction);
manual + bulk reassign; teams (users → `teamId`) that round-robin distributes across.

**Alert** — in-app "New Lead Alert" bell (polls unread) + optional web-push for closed-tab delivery.

**Work** — leads list (search/status filter, bulk assign/status), pipeline kanban (drag to change
status), status + owner controls, tags, custom fields (`customData`), follow-ups + reminders
(BullMQ delayed jobs), automations (trigger→condition→action), notes/activity timeline.

**Message** — WhatsApp via a BSP (Watxio): send, auto-send on new lead (automation action),
inbound replies + delivery-status webhook, threaded conversation view, 24h-window enforcement;
message templates CRUD; native deep links (wa.me/sms/mailto) as a no-API fallback.

**Admin** — lead sources, message templates, users (create/deactivate, bcrypt), teams;
role enforcement (`requireAdmin`) on the sensitive surfaces.

## Architecture notes

- **Event bus is a `globalThis` singleton** (`src/lib/events/emitter.ts`) and handlers are
  registered once at server startup via `src/instrumentation.ts`. This is load-bearing: without
  it, Next duplicates the module across bundles and every domain event (lead.created,
  lead.assigned, status changes) fires with no listener — automations, activity logging, and
  notifications all silently no-op. Don't "simplify" it back to a plain module singleton.
- **Workers** (`src/lib/jobs/workers/*`) run in-process off the same Redis. For real scale, run
  them as a separate process rather than importing the queues into the web server.
- **Watxio client is isolated** to `src/lib/messaging/whatsapp/client.ts`. Six `WATXIO_DOC`
  markers flag the three unknowns (auth header, send endpoint/body, response shape). Shaped on
  the Meta Cloud API format most BSPs proxy — confirm against Watxio's real docs; nothing else
  changes.

## Known corners (deliberate shortcuts)

| Area | Shortcut | Upgrade when |
|---|---|---|
| WhatsApp webhook | no `x-hub-signature-256` verification | Watxio's signing scheme is known |
| WhatsApp creds | single number from env | multi-number/tenant → `integration_accounts` |
| Inbound match | exact phone-digit match, no index | inbound volume grows / country-code fuzzing needed |
| Kanban | loads ≤500 leads, no pagination | a stage holds thousands |
| Custom fields | values saved as strings | nested-object editing matters |
| Web-push | delivery unverified in this env (browser blocks the permission prompt) | test in a real browser with a granted permission |
| Roles | only `requireAdmin` gates user/team admin | broaden the role model |
| Activity log | assignment note shows raw user UUID, not name | cosmetic polish |
| ESLint | `ignoreDuringBuilds` (TypeScript checks stay on) | run `next lint` in CI separately |

## Bugs found by running it live (all fixed)

- **Dead event layer** — handlers never imported → no listeners registered (see Architecture).
- **Hydration mismatch** — `toLocaleDateString()` differs server (en-US) vs browser locale.
- **Webhook sourceId drop** — read from query but worker only checked body; now folded into payload.
- **Missing `"use server"`** in `csv.ts` → BullMQ bundled into the client → build failure.
- **Dead nav link** `/sources` → `/settings/sources`; wrong page `<title>`; unwired Logout.
- **Static-prerender crash** — DB pages need `force-dynamic` (set once in the dashboard layout).

## Verified live (against Postgres + Redis)

Login/session · leads list + filters · bulk status change (+ status history) · kanban render ·
lead status/owner/tags/custom-fields (all persisted) · WhatsApp 24h-window guard ·
CSV/source screens · user create (bcrypt) + deactivate · teams create + assign · role gate
(blocked non-admin, allowed admin) · **new-lead notification + activity now fire on assignment**.
