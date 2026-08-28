# Privyr v2 — Full System Audit (verified)

**Date:** 2026-08-28
**Method:** Static trace of the full stack (schema → services → workers → actions/routes → pages) plus wiring analysis (which modules are actually imported/started at runtime) and `tsc --noEmit`. Where the code *exists* but is never reached at runtime, it is reported as broken, not complete.
**Coverage note:** Critical flows (auth/RBAC, tenant isolation, ingestion, events, automations, workers, public API) were traced end-to-end and verified. The ~40 lead "analytics" services were audited for *reachability* (wiring), not line-by-line correctness — they are unreachable, so internal correctness is moot until they're wired.

> ⚠️ The two pre-existing docs (`BUILD_STATUS.md`, `PRIVYR_V2_COMPLETION_AUDIT.md`) overstate completeness. Several items marked "COMPLETE / VERIFIED" there are **implemented but never executed at runtime** (see §6). Treat this file as the corrected picture.

---

## FIXES APPLIED (2026-08-28, same session)

All critical/high/medium **bugs** below are fixed. `tsc --noEmit` clean; 175 unit tests pass (171 + 4 new signature tests). **A DB migration is pending — run `npx drizzle-kit migrate`** (adds `automations.organization_id`; the migration **deletes pre-tenancy automation rows**, which have no org and were the cross-firing bug — recreate them after migrating).

| Audit item | Status | Change |
|---|---|---|
| 6.1 Follow-up reminders dead | ✅ Fixed | `instrumentation.ts` now imports `reminderWorker` (starts the consumer). |
| 6.2 Score decay / SLA escalation workers dead | ✅ Fixed | `instrumentation.ts` starts both workers; added `scheduleScoreDecayScan` (daily) + existing `scheduleEscalationScan` (15-min) as their producers. |
| 6.2 Webhook-retry worker dead | ⚠️ Deferred (by design) | No producer/config surface exists — speculative feature, not a bug. Left unstarted with a note; wire when outbound webhooks become real. |
| 6.3 Automations run cross-tenant | ✅ Fixed | Added `automations.organization_id` (migration `0016`); `dispatchTrigger` now scopes by the lead's org. |
| 6.4 Automations no auth / IDOR | ✅ Fixed | `actions/automations.ts`: reads `requireOrg` (org-scoped), writes `requirePermission("automations.manage")`, Zod validation, all queries org-scoped. New permission key added. |
| 6.5 ~26 orphaned analytics services | ⏸️ Needs product decision | Not deleted — unreachable ≠ broken. Wire the ones you want or delete; not touched to avoid discarding intended work. |
| S1/S2 automations security | ✅ Fixed | Same as 6.3/6.4. |
| S3 no middleware / unguarded pages | ✅ Fixed | Added `src/middleware.ts` (NextAuth) guarding all dashboard routes; redirects to `/login`. |
| S4 webhook signatures | ✅ Fixed | `verifyMetaSignature` helper; FB leadgen enforces `x-hub-signature-256` when `FACEBOOK_APP_SECRET` set; WhatsApp when `WATXIO_APP_SECRET` set (else skipped, documented). |
| S5 automation validation | ✅ Fixed | Zod schema on `createAutomation`. |
| 9 idempotency double-run | ✅ Fixed | `automationQueue.add(..., { jobId: idempotencyKey })` — BullMQ-native dedup; added queue retention. |
| 9 FK cascade on org delete | ✅ Fixed (automations) | New FK is `ON DELETE CASCADE`. Other tables' cascade behavior unchanged — verify separately if needed. |
| 11 automation_runs unbounded growth | ⏸️ Noted | Queue jobs now prune (`removeOnComplete`); the `automation_runs` *table* still needs a retention job (not built — YAGNI until it matters). |
| §7 change_status needs actor | ⏸️ Noted | Unchanged: automations needing an actor on a user-less webhook lead still throw by design (can't attribute a status change to nobody). |

**Files touched:** `src/instrumentation.ts`, `src/middleware.ts` (new), `src/lib/webhooks/signature.ts` (+test, new), `src/db/schema/automations.ts`, `drizzle/0016_huge_donald_blake.sql` (new), `src/lib/actions/automations.ts`, `src/lib/events/handlers.ts`, `src/lib/permissions.ts`, `src/lib/jobs/workers/automationWorker.ts`, `src/lib/jobs/workers/scoreDecayWorker.ts`, `src/app/api/webhooks/facebook/route.ts`, `src/app/api/webhooks/whatsapp/route.ts`, `.env.example`.

---

## 1. Complete list of existing features

**Capture / ingestion**
- Manual lead add; public JSON API (`POST /api/v1/leads`); CSV import; webhook ingestion (`/api/webhooks/[provider]`, `/api/webhooks/facebook`), all funneling `webhook_events` → BullMQ ingestion queue → adapter → dedupe → lead.
- Adapters: `WebFormAdapter`, `FacebookLeadAdsAdapter`, `GenericWebhookAdapter`.

**Route / assign**
- `AssignmentService`: single, bulk, round-robin (row-locked), auto-assign on new lead.
- Teams (`teamId`) for round-robin distribution.

**Work**
- Leads list (server-side search/filter/sort/pagination), Kanban (per-stage load-more), lead detail (status, owner, tags, custom fields, notes/activity timeline).
- Saved views, duplicates/merge screen, follow-ups + calendar, automations builder.

**Message**
- WhatsApp via Watxio BSP (send, auto-send, inbound + status webhook, 24h window), message templates, native deep links (wa.me/sms/mailto).

**Alert**
- In-app notification bell (poll unread) + Web Push subscription.

**Admin / platform**
- Auth (NextAuth credentials, bcrypt), RBAC (roles + permission catalog), multi-tenant orgs, invitations, API keys, audit log, custom fields, custom statuses, lead sources, billing (Razorpay), Google Calendar integration, booking pages (`/book/[slug]`).

**Dashboards**
- Executive dashboard + "my dashboard" (live aggregations via one `AnalyticsService`).

**Declared-but-orphaned** (code + unit tests exist, **no UI/API/worker reaches them** — see §6): ~26 "advanced analytics" services (pipeline velocity, win/loss, cohort, geo, LTV, scorecard, stagnation, engagement health/velocity, source ROI, capacity assignment, next-best-action, reengagement cadence, revenue forecast, optimal contact time, smart segmentation, stale-lead reclamation, team performance, activity digest, channel analytics, aging, audit export, duplicate resolution, follow-up escalation, webhook DLQ, iframe postMessage worker).

---

## 2–5. Feature status matrix (frontend / backend / DB / E2E)

Legend: ✅ works · ⚠️ works with gaps · ❌ broken at runtime · 🗑️ orphaned (unreachable)

| Feature | FE | BE | DB/rel | E2E flow | Notes |
|---|---|---|---|---|---|
| Auth / session | ✅ | ✅ | ✅ | ✅ | NextAuth credentials, bcrypt, JWT carries org+role |
| RBAC | ✅ | ✅ | ✅ | ⚠️ | Centralized in `lib/rbac`; **not applied on automations** (§10) |
| Tenant isolation | ✅ | ✅ | ⚠️ | ⚠️ | Enforced everywhere **except automations** (no `organization_id`) |
| Lead capture (manual/API/CSV) | ✅ | ✅ | ✅ | ✅ | Public API key- + plan-gated |
| Webhook ingestion | ✅ | ✅ | ✅ | ⚠️ | FB/WhatsApp POST **not signature-verified** (§10) |
| Dedup | n/a | ✅ | ✅ | ✅ | Org-scoped |
| Assignment / round-robin | ✅ | ✅ | ✅ | ✅ | `FOR UPDATE` locked |
| Leads list/search/filter/sort | ✅ | ✅ | ✅ | ✅ | Server-side; the strongest subsystem |
| Kanban | ✅ | ✅ | ✅ | ✅ | Per-stage load-more |
| Tags / custom fields / statuses | ✅ | ✅ | ✅ | ✅ | |
| Notifications (in-app bell) | ✅ | ✅ | ✅ | ✅ | Fires on assignment via event handler |
| Web Push | ⚠️ | ⚠️ | ✅ | ❌ | Subscription stored; **reminder delivery worker dead** (§6) |
| Follow-ups / reminders | ✅ | ⚠️ | ✅ | ❌ | Jobs **enqueued but never consumed** — `reminderWorker` never started (§6) |
| Automations | ⚠️ | ❌ | ❌ | ❌ | **No tenant isolation, no auth, no validation, cross-tenant execution** (§6/§10) |
| WhatsApp messaging | ✅ | ⚠️ | ✅ | ⚠️ | Send/inbound wired; Watxio API shape unconfirmed; no webhook signature |
| Score decay | n/a | ❌ | ✅ | ❌ | `scoreDecayWorker` factory never called |
| SLA escalation | ⚠️ | ❌ | ✅ | ❌ | `escalationWorker`/`scheduleEscalationScan` never called |
| Outbound webhooks (lead events) | n/a | ❌ | ✅ | ❌ | `webhookRetryWorker` never started → deliveries never dispatched |
| Executive dashboard | ✅ | ✅ | ✅ | ✅ | Uses the one wired `AnalyticsService` |
| ~26 advanced analytics services | ❌ | 🗑️ | n/a | ❌ | No page/route/worker imports them |
| API keys / audit / invitations / billing / Google Cal / booking | ✅ | ✅ | ✅ | ⚠️ | Guarded actions; not deeply runtime-verified against live 3rd-party APIs |

---

## 6. Broken or incomplete functionality (VERIFIED)

### 6.1 — Follow-up reminders never fire (CRITICAL)
- **Location:** `src/lib/jobs/workers/reminderWorker.ts` (worker) vs `src/lib/jobs/queue.ts` (queue) vs `src/domains/follow-ups/service.ts:46`.
- **What's wrong:** `reminderQueue` (producer) lives in `queue.ts`; the consumer `reminderWorker = new Worker(REMINDER_QUEUE_NAME, …)` lives in `reminderWorker.ts`, which **is imported by nothing** (0 references outside its own test). Importing the queue does not import the worker.
- **Why it's a problem:** BullMQ jobs are added to Redis but no worker consumes them. The "Alert" pillar (in-app + web-push follow-up reminders, timeline logging) silently no-ops.
- **Expected:** At the due time, the owner gets a reminder notification/push and an activity entry.
- **Current:** Job sits in Redis forever; nothing delivered.
- **Affected:** Follow-ups, reminders, Web Push, activity timeline.
- **Fix:** Import `reminderWorker` at startup — add `await import("@/lib/jobs/workers/reminderWorker")` to `src/instrumentation.ts` (same mechanism that loads event handlers), or run a dedicated worker process.

### 6.2 — Three more workers never start (HIGH)
- **Location:** `scoreDecayWorker.ts`, `webhookRetryWorker.ts`, `escalationWorker.ts`.
- **What's wrong:** Each exports a `createXWorker()` factory (and `scheduleEscalationScan`) that is **never called** anywhere in `src`. No `new Worker` runs for them.
- **Consequences:**
  - Score decay never applied → lead scores drift stale.
  - Outbound lead webhooks (`leadWebhookEventService`) are built + signed but **never dispatched/retried** (webhook-delivery queue has no consumer).
  - SLA escalation scans never run → no overdue escalation, despite the SLA schema/migration `0012`.
- **Fix:** Call the factories once at startup (instrumentation) and schedule the repeatable escalation scan.

### 6.3 — Automations are not tenant-scoped and run cross-tenant (CRITICAL)
- **Location:** `src/db/schema/automations.ts`, `src/lib/events/handlers.ts:11-22`, `src/lib/actions/automations.ts`.
- **What's wrong:**
  1. `automations` table has **no `organization_id`** (confirmed: no migration ever adds it).
  2. `dispatchTrigger` selects active automations by **trigger `type` only** — it cannot filter by org.
  3. Therefore any org's `lead.created`/`lead.assigned`/etc. event matches **every** org's automations with that trigger.
- **Why it's a problem:** Org A's automation ("add note", "send WhatsApp template", "schedule follow-up", "change status") executes against **Org B's leads**. Cross-tenant data leak + integrity corruption. (`assign_lead` is partly saved by `AssignmentService`'s own tenant check, which would throw; `add_note`/`create_task`/`send_whatsapp` are not protected and will run.)
- **Expected:** An automation runs only on leads of its own organization.
- **Current:** Runs on all organizations' leads.
- **Affected:** Automations, WhatsApp, follow-ups, activity, multi-tenancy guarantee.
- **Fix:** Add `organization_id` to `automations` (+ backfill/migration), set it on create, and join+filter on it in `dispatchTrigger` and the engine's lead lookup.

### 6.4 — Automations UI + actions have no auth and no scoping (CRITICAL, tied to 6.3)
- **Location:** `src/lib/actions/automations.ts` (all 5 exports), `src/app/(dashboard)/automations/page.tsx`, `automations/create/page.tsx`.
- **What's wrong:** No `requireOrg/requireAuth/requirePermission` in the actions; `getAutomations()` = `db.select().from(automations)` (all tenants); `getAutomation/toggle/delete(id)` operate on any id with no org check (IDOR); `createAutomation` sets no org and comment admits "Needs proper schema validation with Zod." The pages themselves also call **no auth guard**, and there is **no `middleware.ts`** and the dashboard layout does not guard — so these pages render without a session.
- **Why:** Any visitor can list all tenants' automation names and create/toggle/delete automations.
- **Fix:** Guard every action with `requirePermission`/`requireOrg`, scope all queries by org, add Zod validation; guard the pages.

### 6.5 — ~26 analytics services are unreachable dead code (MEDIUM)
- **Location:** `src/domains/leads/*AnalyticsService.ts`, `*Service.ts` (pipeline velocity, win/loss, cohort, geo, LTV, scorecard, stagnation, engagement*, source ROI, capacity assignment, next-best-action, reengagement, revenue forecast, optimal contact time, smart segmentation, stale reclamation, team performance, activity digest, channel analytics, aging, audit export, duplicate resolution, follow-up escalation, webhook DLQ, iframe worker).
- **What's wrong:** Each has a unit test but **zero non-test importers** — no page, route, action, or worker calls them. The completion audit lists all as "COMPLETE."
- **Why:** Large maintenance/comprehension burden; green tests give false confidence that features ship. None are user-reachable.
- **Fix:** Either wire them to UI/API deliberately, or delete until needed (YAGNI).

---

## 7. Logic inconsistencies
- **Automation `change_status`/`add_note` require an actor `userId`** (`engine.ts:114`) but webhook/round-robin-created leads carry no user → those automations always throw on `lead.created`. Inconsistent with the "auto-reply to fresh lead" use case the code comments describe.
- **Two parallel "escalation" implementations:** `domains/leads/escalationService.ts` and `followUpEscalationService.ts` + `jobs/workers/escalationWorker.ts` — overlapping intent, none wired.
- **Two analytics layers:** one real (`lib/analytics/service.ts`, used) and ~26 orphaned domain analytics services (unused). Duplicated concepts (revenue-by-source exists in both).
- **`getAutomations()` comment** says "we just need basic info" but the detail fetchers exist unused; the settings gear button in the list is a no-op (`variant="ghost"` with no handler).

## 8. Frontend/backend mismatches
- **Follow-ups UI** presents scheduling as working; backend enqueues but the consumer is dead (6.1) → user sees "scheduled" with no delivery.
- **Web Push** UI subscribes and stores a subscription, but the only delivery path (reminder worker) is dead → permission granted, nothing arrives.
- **Automations builder** submits to an unvalidated, unscoped action; created automation shows in a cross-tenant list.
- **Outbound webhook config** (if surfaced) implies deliveries; retry worker dead → no deliveries.

## 9. Database / data-integrity issues
- **`automations` (+ triggers/conditions/actions/runs) lack `organization_id`** → cannot enforce tenancy (root of 6.3).
- **`automation_runs.idempotency_key` is indexed but not UNIQUE** (`schema/automations.ts:46`) → concurrent duplicate events can double-insert run rows / double-execute before the status check catches up.
- **Orphaned-record risk:** deleting an org/user does not cascade to automations (no FK to org). Verify FK `onDelete` behavior for leads↔activities↔follow-ups↔messages before relying on cascade.
- Otherwise, tenant-scoped tables (leads, follow-ups, saved_views, etc.) carry `organization_id` and indexes (migration set 0000–0015 is coherent for those).

## 10. Security & permission issues
| # | Issue | Severity |
|---|---|---|
| S1 | Automations actions + pages unauthenticated & unscoped; cross-tenant IDOR (6.4) | Critical |
| S2 | Cross-tenant automation execution (6.3) | Critical |
| S3 | No `middleware.ts`; auth relies on each page calling `requireOrg`. Pages that don't: `/automations`, `/automations/create`, `/settings`, `/settings/sources`, `/settings/templates`. Data mutations under sources/templates are guarded at the action layer, but the pages render unauthenticated and automations is fully open. | High |
| S4 | Facebook `POST /leadgen` and WhatsApp inbound webhooks are **not signature-verified** (`x-hub-signature-256`) — spoofable lead injection. Known shortcut for WhatsApp; FB should verify. | High |
| S5 | `createAutomation` accepts `data: any`, no Zod validation — untrusted JSON written to config. | Medium |
| S6 | Razorpay/webhook signature paths present but not runtime-verified in this audit — confirm secret comparison is constant-time and required. | Medium (verify) |

## 11. Performance concerns
- **Workers run in-process** with the web server (documented). Fine for now; a stuck job blocks the web node. Move to a dedicated worker process for scale.
- **Automation dispatch** issues a DB query per event with no org filter → scans grow with total automations across all tenants (also the tenancy bug).
- **`automation_runs`** grows unbounded (no `removeOnComplete` for that table; only the queue prunes). Add retention.
- WhatsApp inbound match is exact phone-digit, no index (documented shortcut).

## 12. Technical debt & architectural concerns
- **~26 orphaned services + their tests** (§6.5) — dead weight; largest single source of "looks done, isn't."
- **Duplicated escalation & analytics** implementations (§7).
- **ESLint disabled during build** (`next.config.ts`) — TS stays on, but lint regressions won't fail CI.
- **Comments admitting MVP shortcuts** left in shipping paths (`automations.ts:9`).
- **Event bus + worker startup depend on `instrumentation.ts` import side-effects** — load-bearing and fragile; adding a worker requires remembering to import it there (this is exactly why 4 workers are dead).

## 13. Dependencies between features
- **Events → everything:** `instrumentation.ts` → `handlers.ts` is the spine. If it fails to load, automations dispatch, activity logging, and new-lead notifications all no-op. (This is wired correctly today.)
- **Follow-ups → reminderWorker → notifications/push:** broken link at the worker (6.1).
- **Ingestion → adapters → dedup → assignment → events → notifications:** this chain is wired and works.
- **Automations → assignment/whatsapp/follow-ups/activity:** works mechanically but fires cross-tenant (6.3) and can throw on user-less leads (§7).
- **Outbound webhook events → webhookRetryWorker:** broken (6.2).

## 14. Critical vs minor
- **Critical:** 6.1 (reminders dead), 6.3 (cross-tenant automations), 6.4 (automations auth/IDOR).
- **High:** 6.2 (score decay / webhook retry / SLA workers dead), S3 (page auth gaps), S4 (webhook signatures).
- **Medium:** 6.5 (dead analytics), S5 (validation), 9.idempotency uniqueness, automation_runs retention.
- **Minor:** no-op settings gear button, dual escalation/analytics duplication, ESLint-in-build.

## 15. Recommended fixes, prioritized by impact
1. **Start the dead workers.** Add `reminderWorker`, and call `createScoreDecayWorker()`, `createWebhookRetryWorker()`, `createEscalationWorker()` + `scheduleEscalationScan()` from `instrumentation.ts` (or a dedicated worker entrypoint). *(Smallest diff, restores 4 "complete" features.)*
2. **Fix automation tenancy + auth.** Add `organization_id` to `automations` (migration + backfill), set on create, filter in `dispatchTrigger` and engine; add `requirePermission`/org-scoping + Zod to `actions/automations.ts`; guard the pages. *(Closes the two critical security bugs.)*
3. **Add global auth.** Introduce `middleware.ts` (or a guarded segment layout) so no `(dashboard)` page renders without a session — defense in depth over per-page `requireOrg`.
4. **Verify inbound webhook signatures** (FB leadgen; WhatsApp when Watxio's scheme is known).
5. **Decide on the 26 orphaned analytics services** — wire the few that matter, delete the rest.
6. **Harden data:** UNIQUE constraint on `automation_runs.idempotency_key`; retention for run rows; confirm FK cascade behavior.
7. **CI:** run `next lint` and the vitest/playwright suites in CI so dead-wiring regressions surface (note: current unit tests pass on the dead workers because they test the factory in isolation, not that it's started — add one integration assertion that startup registers the workers).

---

### Empirical checks run during this audit
- `npx tsc --noEmit` → **0 errors** (confirmed; compiles clean).
- Wiring analysis (import graph) → confirms 4 workers + 26 services have no runtime path.
- Did **not** run `next build`/`vitest`/`playwright` live (dev server / DB state not exercised); prior docs' green results are plausible for compilation/unit level but do **not** prove the runtime gaps above are covered — they aren't.
