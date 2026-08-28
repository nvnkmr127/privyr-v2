# Privyr v2 — System Audit (current working tree)

**Date:** 2026-08-28 (second pass, same day)
**Supersedes:** `SYSTEM_AUDIT_2026-08-28.md`, which describes the **pre-fix** state. That doc's fixes are now sitting **uncommitted in the working tree**; this pass verifies the *current* code, not the old snapshot.
**Method:** Re-traced the modified files end-to-end, ran `npx tsc --noEmit` (0 errors), and re-ran the import-graph/reachability analysis. Where code exists but nothing reaches it at runtime, it is reported as dead — not complete.

> **Bottom line:** The three CRITICAL bugs from the first pass (dead reminder worker, cross-tenant automations, automations auth/IDOR) are **fixed in code and compile clean**. But the fix depends on an **unapplied DB migration (0016)** that will fail-closed if not run, there is **one new data-integrity landmine** the first pass missed (org-delete FK), and the "26 orphaned analytics services" are **not actually resolved** — they were wrapped in 24 server actions that no UI calls.

---

## 0. What changed since the first pass (verified present in working tree)

| Fix | Verified | Evidence |
|---|---|---|
| `middleware.ts` guards all dashboard routes | ✅ | `src/middleware.ts` — `withAuth`, matcher covers `/`, `/leads`, `/automations`, `/follow-ups`, `/my-dashboard`, `/profile`, `/settings` |
| Automations org-scoped + `requirePermission("automations.manage")` + Zod | ✅ | `src/lib/actions/automations.ts` — all 5 exports guarded, every query filtered by `organizationId` |
| `dispatchTrigger` scopes by the lead's org | ✅ | `src/lib/events/handlers.ts:11-31` — looks up `lead.organizationId`, joins `automations.organizationId` |
| `automations.organization_id` added (NOT NULL, cascade) | ✅ (schema) | `src/db/schema/automations.ts:10` + migration `drizzle/0016_huge_donald_blake.sql` |
| 4 dead workers started at boot | ✅ | `src/instrumentation.ts` — imports `reminderWorker`, `automationWorker`; calls `createEscalationWorker/scheduleEscalationScan`, `createScoreDecayWorker/scheduleScoreDecayScan` |
| Razorpay webhook signature (constant-time, raw body) | ✅ | `src/lib/billing/razorpay.ts:60-70` — HMAC-SHA256 + `crypto.timingSafeEqual`; route reads `req.text()` before verify |
| BullMQ `jobId` idempotency on automation dispatch | ✅ | `handlers.ts:44` — `{ jobId: idempotencyKey }`; queue prunes `removeOnComplete` |
| `tsc --noEmit` | ✅ | 0 errors |

---

## 1. Complete list of existing features

**Capture / ingestion** — Manual add; public JSON API (`POST/GET /api/v1/leads`, API-key + plan gated); CSV import; webhook ingestion (`/api/webhooks/[provider]`, `/facebook`, `/whatsapp`) → `webhook_events` → BullMQ ingestion queue → adapter → dedupe → lead. Adapters: WebForm, FacebookLeadAds, GenericWebhook.

**Route / assign** — `AssignmentService`: single, bulk, round-robin (`FOR UPDATE` row-locked), auto-assign on new lead; teams for distribution.

**Work** — Leads list (server-side search/filter/sort/pagination), Kanban (per-stage load-more), lead detail (status/owner/tags/custom fields/notes timeline), saved views, duplicates/merge, follow-ups + calendar, automations builder, command palette.

**Message** — WhatsApp via Watxio BSP (send, auto-send, inbound + status webhook, 24h window), templates, native deep links.

**Alert** — In-app notification bell (poll unread) + Web Push subscription + email notification preferences.

**Admin / platform** — Auth (NextAuth credentials + bcrypt), RBAC (roles + permission catalog, centralized in `lib/rbac`), multi-tenant orgs, invitations, API keys, audit log, custom fields, custom statuses, lead sources, billing (Razorpay), Google Calendar, booking pages (`/book/[slug]`), Facebook OAuth + Meta token refresh.

**Dashboards** — Executive + "my dashboard" (live aggregation via `lib/analytics/service.ts`).

**Declared but not user-reachable** — ~24 "advanced analytics" services, each wrapped in a server action in `actions/leads.ts`, **called by no page or component** (see §6.5).

---

## 2–5. Feature status matrix

Legend: ✅ works · ⚠️ works with gaps · ❌ broken at runtime · 🗑️ unreachable · ⏳ correct in code, blocked on migration

| Feature | FE | BE | DB/rel | E2E | Notes |
|---|---|---|---|---|---|
| Auth / session | ✅ | ✅ | ✅ | ✅ | NextAuth credentials, bcrypt, JWT carries org+role |
| RBAC | ✅ | ✅ | ✅ | ✅ | Centralized `lib/rbac`; admin implicit-all; now applied to automations |
| Middleware auth gate | ✅ | ✅ | n/a | ✅ | `withAuth` over all dashboard segments |
| Tenant isolation | ✅ | ✅ | ⏳ | ⏳ | Enforced in code incl. automations — **but automation scoping needs migration 0016 applied** |
| Lead capture (manual/API/CSV) | ✅ | ✅ | ✅ | ✅ | Public API key- + plan-gated, Zod-validated |
| Webhook ingestion | ✅ | ✅ | ✅ | ✅ | Signatures verified (Razorpay confirmed; FB/WhatsApp gated on secret env) |
| Dedup / merge | ✅ | ✅ | ✅ | ✅ | Org-scoped |
| Assignment / round-robin | ✅ | ✅ | ✅ | ✅ | `FOR UPDATE` locked |
| Leads list/search/filter/sort/kanban | ✅ | ✅ | ✅ | ✅ | Strongest subsystem |
| Tags / custom fields / statuses | ✅ | ✅ | ✅ | ✅ | |
| Notifications (in-app bell) | ✅ | ✅ | ✅ | ✅ | Fires on assignment via event handler |
| Web Push / reminders | ✅ | ✅ | ✅ | ✅ | **reminderWorker now started** — delivery path live |
| Automations | ✅ | ✅ | ⏳ | ⏳ | Org-scoped + guarded in code; **execution correct only after 0016 applied** |
| WhatsApp messaging | ✅ | ⚠️ | ✅ | ⚠️ | Send/inbound wired; Watxio API shape unconfirmed against live API |
| Score decay / SLA escalation | n/a | ✅ | ✅ | ✅ | Workers + repeatable schedulers now started |
| Outbound webhooks (lead events) | n/a | ❌ | ✅ | ❌ | `webhookRetryWorker` intentionally not started — no producer/config surface (dead-by-design) |
| Executive / my dashboard | ✅ | ✅ | ✅ | ✅ | Uses the one wired `AnalyticsService` |
| ~24 advanced analytics | ❌ | 🗑️ | n/a | ❌ | Wrapped in server actions; **no UI calls them** (§6.5) |
| API keys / audit / invitations / billing / Google Cal / booking | ✅ | ✅ | ✅ | ⚠️ | Guarded; not runtime-verified against live 3rd-party APIs |

---

## 6. Broken / incomplete / at-risk (verified this pass)

### 6.1 — Migration 0016 is unapplied and fail-closed (CRITICAL — deploy blocker)
- **Location:** `drizzle/0016_huge_donald_blake.sql`, `src/db/schema/automations.ts:10`.
- **What's wrong:** The schema now declares `organization_id ... NOT NULL`, but the migration that adds that column is **pending** (uncommitted, not run). Until `npx drizzle-kit migrate` runs, the Drizzle model and the live table disagree: every `INSERT INTO automations` (from `createAutomation`) will fail because the code sends `organization_id` to a column that doesn't exist yet.
- **Also:** the migration **DELETEs all existing automations + children** (they predate tenancy and have no correct org to backfill). This is intentional and documented in the SQL, but it is destructive — existing customers' automations vanish and must be recreated.
- **Expected:** Run migration in the deploy pipeline; communicate the automation reset.
- **Current:** Fix is inert (and `createAutomation` would error) until the migration is applied.
- **Severity:** CRITICAL. The headline security fix does not take effect, and automation creation breaks, until this runs.

### 6.2 — Org-delete cascades break on automation children (HIGH — data integrity, NEW)
- **Location:** `src/db/schema/automations.ts:10,21,31,37,44`.
- **What's wrong:** `automations.organization_id` is `ON DELETE cascade`, but `automation_triggers/conditions/actions/runs.automation_id` reference `automations` with **no `onDelete`** (defaults to `NO ACTION`/restrict). Deleting an organization cascades into `automations`, which then FK-violates against its own child rows → the org delete **fails** whenever the org has any automation with a trigger/action/run.
- **Why it matters:** Any future "delete organization / offboard tenant" path will throw, or leave the tenant half-deleted. The app's own `deleteAutomation()` dodges this by deleting children first (verified `actions/automations.ts:104-107`), so today's UI path is safe — this is a latent landmine, not a live bug.
- **Current status:** Org deletion is **not exposed** anywhere in `src/` (grep: no `deleteOrganization` / `db.delete(organizations)`), so unreachable today.
- **Fix:** Add `{ onDelete: 'cascade' }` to the four child FKs (migration), so parent cascade propagates.
- **Severity:** HIGH if org-deletion is ever built; latent now. The first-pass audit missed this.

### 6.3 — ~24 advanced analytics services are still dead, one layer deeper (MEDIUM)
- **Location:** `src/lib/actions/leads.ts:233-458` (24 `get…Action` exports) → `src/domains/leads/*Service.ts`.
- **What's wrong:** The first pass reported these services had "zero non-test importers." They now each have exactly one importer — a server action in `actions/leads.ts` (e.g. `getPipelineVelocityMetricsAction`, `getWinLossAnalyticsAction`, `getGeoAnalyticsAction`, `getLtvAnalyticsAction`, …). **But those actions are imported by zero pages/components** (verified: 0 UI files reference any of the 24). The dead code moved up a layer; it is not reachable by a user.
- **Not a security risk:** every action guards with `requireOrg()` and scopes by `organizationId` (verified) — so even if wired, no IDOR.
- **Why it matters:** ~24 services + ~24 actions + their tests are maintenance weight and give a false "analytics is done" signal. Green tests exercise factories/services in isolation, never a user path.
- **Fix:** Wire the handful that matter to real dashboard UI, or delete the rest (YAGNI).
- **Severity:** MEDIUM (debt / false-completeness), not correctness or security.

### 6.4 — `automation_runs` grows unbounded; idempotency key not UNIQUE (LOW/MEDIUM)
- **Location:** `src/db/schema/automations.ts:42-55`, `src/lib/jobs/workers/automationWorker.ts:30-55`.
- **What's wrong:** (a) The BullMQ *queue* prunes (`removeOnComplete`), but the `automation_runs` **table** has no retention — it grows forever. (b) `idempotency_key` is indexed but **not UNIQUE**; the worker's short-circuit only fires when a prior run's status is exactly `'completed'` (a `'skipped'` prior run does not short-circuit). BullMQ `jobId` dedup at enqueue is the real guard, so double-inserts are unlikely in practice, but the DB doesn't enforce it.
- **Fix:** Retention job for `automation_runs`; add a UNIQUE constraint on `idempotency_key` (or accept queue-level dedup and document it).
- **Severity:** LOW now, MEDIUM at scale.

### 6.5 — Outbound webhook delivery is non-functional by design (INFO)
- `webhookRetryWorker` is deliberately **not** started (`instrumentation.ts:32-34`) — no producer/config surface exists. `leadWebhookEventService` builds+signs events that are never dispatched. This is a speculative feature stub, correctly left off. Not a bug; do not "fix" by starting the worker until an outbound-webhook config UI exists.

---

## 7. Logic inconsistencies (verified still present)
- **Actor-required automations throw on user-less leads.** `engine.ts:114` (`change_status`) and `add_note`/`send_whatsapp` (userId passed through) require an actor `userId`. Webhook/round-robin-created leads carry no user in the payload → a "change status on new lead" automation always throws on `lead.created` from ingestion. Directly contradicts the "instant-reply to a fresh lead" use case the code comments describe (`engine.ts:142`). `assign_lead` falls back to the literal string `"automation"` as `assignedById`, which works only because `AssignmentService` tolerates it.
- **Two parallel escalation implementations:** `domains/leads/escalationService.ts` and `followUpEscalationService.ts` + `jobs/workers/escalationWorker.ts`. Overlapping intent; only the worker path is wired.
- **Two analytics layers:** `lib/analytics/service.ts` (wired, used by dashboards) vs. the 24 orphaned `domains/leads/*AnalyticsService.ts` (unreachable). Revenue-by-source concept exists in both.

## 8. Frontend / backend mismatches
- **Automations builder** now submits to a guarded, org-scoped, Zod-validated action — but the created automation **won't execute correctly until migration 0016 is applied** (§6.1), and `createAutomation` will actually error before then. UI implies success; DB will reject the insert.
- Web Push / follow-up reminders: previously a dead-worker mismatch — **now resolved** (worker started). No remaining mismatch.

## 9. Database / data-integrity issues
- **Migration 0016 pending** (§6.1) — schema/DB disagreement, destructive on apply.
- **Automation child FKs lack cascade** (§6.2) — org-delete landmine.
- **`automation_runs.idempotency_key` not UNIQUE** (§6.4).
- **`automation_runs` unbounded** (§6.4).
- Otherwise tenant-scoped tables (leads, follow-ups, saved_views, etc.) carry `organization_id` + indexes; migration set 0000–0015 is coherent.
- **Not verified this pass:** FK `onDelete` behavior for leads↔activities↔follow-ups↔messages↔notifications cascade chains — recommend a targeted check before relying on org-cascade delete anywhere.

## 10. Security & permission issues
| # | Issue | Status | Severity |
|---|---|---|---|
| S1 | Automations actions/pages unauthenticated & cross-tenant IDOR | ✅ Fixed (guards + org scope + Zod + middleware) | was Critical |
| S2 | Cross-tenant automation execution | ✅ Fixed in code / ⏳ needs migration 0016 to take effect | was Critical |
| S3 | No middleware; unguarded pages | ✅ Fixed (`middleware.ts`) | was High |
| S4 | Webhook signatures | ✅ Razorpay verified (constant-time). FB/WhatsApp enforced when app-secret env is set, else skipped-and-logged — **confirm secrets are set in prod** | Medium (verify env) |
| S5 | `createAutomation` no validation | ✅ Fixed (Zod) | was Medium |
| S6 | Razorpay constant-time compare | ✅ Verified (`timingSafeEqual`, length-checked) | Resolved |
| S7 | Public API error mapping | `POST /api/v1/leads` returns `409` for *all* failures incl. plan-limit (should be `402/403`) — info leak/UX only, not a vuln | Low |

## 11. Performance concerns
- **Workers run in-process** with the web server (documented). A stuck job blocks the web node; move to a dedicated worker process for scale.
- **Automation dispatch** now does 1 lead lookup + 1 org-filtered trigger query per event — bounded by per-org automation count (good; the cross-tenant scan is gone).
- **`automation_runs`** grows unbounded (§6.4).
- WhatsApp inbound match is exact phone-digit with no dedicated index (documented shortcut).

## 12. Technical debt & architecture
- **~24 orphaned analytics services + 24 unused actions + tests** (§6.3) — largest single source of "looks done, isn't."
- **Duplicated escalation & analytics** implementations (§7).
- **Worker startup is import-side-effect based** in `instrumentation.ts` — load-bearing and fragile; adding a worker means remembering to import it here (this is exactly why 4 workers were dead in the first pass). An integration test asserting "startup registers workers X/Y/Z" would catch regressions.
- **ESLint disabled during build** (`next.config.ts`) — TS on, lint won't fail CI.
- **MVP-shortcut comments** in shipping paths.

## 13. Dependencies between features
- **`instrumentation.ts` → `handlers.ts` is the spine.** If it fails to load: automation dispatch, activity logging, and new-lead notifications all silently no-op. Wired correctly today; single point of failure.
- **Ingestion → adapters → dedup → assignment → events → notifications:** wired, works.
- **Follow-ups → reminderWorker → notifications/push:** now wired (was broken).
- **Automations → assign/whatsapp/follow-ups/activity:** works mechanically once 0016 applied; still throws on user-less leads (§7).

## 14. Critical vs. minor
- **CRITICAL / blocker:** 6.1 (migration 0016 unapplied — security fix inert + automation creation errors).
- **HIGH:** 6.2 (org-delete FK landmine, latent), S4 (confirm FB/WhatsApp webhook secrets set in prod).
- **MEDIUM:** 6.3 (24 dead analytics actions), 6.4 (runs retention + UNIQUE), §7 actor bug.
- **LOW / info:** S7 (API error codes), dual escalation/analytics duplication, ESLint-in-build, in-process workers.

## 15. Recommended fixes, prioritized by impact
1. **Apply migration 0016** (`npx drizzle-kit migrate`) as the first deploy step, and warn that existing automations are deleted. *Without this, the automation-tenancy security fix does nothing and `createAutomation` errors.* (§6.1)
2. **Add `onDelete: 'cascade'` to the four automation-child FKs** (new migration) before any org-offboarding feature ships. (§6.2)
3. **Confirm `FACEBOOK_APP_SECRET` / `WATXIO_APP_SECRET` are set in prod** so inbound FB/WhatsApp webhooks are actually signature-verified (they skip verification when unset). (S4)
4. **Decide the 24 analytics services:** wire the few worth showing to real dashboard UI, delete the rest. (§6.3)
5. **Harden `automation_runs`:** UNIQUE on `idempotency_key`; add a retention job. (§6.4)
6. **Add a startup integration test** asserting the workers register — the class of "dead worker" bug that this codebase has already hit twice. (§12)
7. **Fix `engine.ts` actor handling** for user-less (webhook) leads, or document that actor-required automations can't trigger on ingestion. (§7)
8. **CI:** run `next lint` + vitest so wiring/lint regressions surface.

---

### Empirical checks run this pass
- `npx tsc --noEmit` → **0 errors**.
- Import-graph reachability → 24 analytics actions in `actions/leads.ts` have **0 UI importers**; `webhookRetryWorker` referenced only in an instrumentation comment (not started).
- Verified fix presence by reading the modified files directly (middleware, automations action, handlers dispatch, instrumentation, razorpay signature, automation worker, schema/migration).
- **Not run:** live `next build` / `vitest` / `playwright` / a real DB migration — DB and Redis state not exercised. Migration-0016 impact (§6.1) is inferred from schema-vs-migration diff, not from a live run.
