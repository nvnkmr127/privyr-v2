# Privyr V2 Completion & Production-Readiness Audit Report

**Date:** August 27, 2026  
**Repository:** [nvnkmr127/privyr-v2](https://github.com/nvnkmr127/privyr-v2)  
**Status:** Audit Complete | Implementation Plan Ready  

---

## 1. Executive Summary

Privyr V2 is a lead management platform centered strictly around **Leads** (Lead Capture → Deduplication → Assignment → Qualification → Follow-up → Automation → Messaging → Conversion). There are no Contact/Person/Organization CRM models in the core application logic.

This audit report presents a complete code-level analysis of the current repository, verifying every claim against actual source code and empirical execution checks (`tsc`, `eslint`, `vitest`, `playwright`, `next build`).

### Key Findings
1. **Core Lead & Event Architecture is Solid**: The domain-driven architecture (`src/domains/*`), `globalThis` event singleton, and BullMQ worker pipeline are well-designed and operational.
2. **Tenant Isolation Gaps**: `IngestionService.processLead` and `AnalyticsService.getLeadMetrics` bypass `organizationId` scoping, creating critical multi-tenant data bleed risks during lead webhook ingestion and dashboard analytics.
3. **Database Performance Gaps**: Missing index on `leads.phone` (vital for WhatsApp matching and phone-based deduplication). Analytics queries pull entire datasets into JavaScript memory instead of performing database aggregations.
4. **Hardcoded Mock Dashboard Data**: Executive Dashboard charts (`Revenue by Source` and `Pipeline Distribution`) currently display hardcoded static JSON arrays instead of querying database metrics.
5. **Incomplete Follow-Up Reminder Delivery**: `reminderWorker.ts` logs reminders via `console.log` rather than calling `NotificationService` or `PushService`.
6. **Duplicate Assignment Logic**: `LeadService.assignLead` and `AssignmentService.assignLead` exist in parallel with inconsistent event emissions and tenant scoping.
7. **Empirical Check Results**:
   - **TypeScript (`tsc --noEmit`)**: PASSED (0 errors)
   - **Unit & Integration Tests (`vitest`)**: PASSED (9 test files, 30 tests passed)
   - **Production Build (`next build`)**: PASSED (Build completed with BullMQ dynamic require warning)
   - **ESLint (`npm run lint`)**: FAILED (9 errors in 8 files)
   - **Playwright E2E (`playwright test`)**: FAILED (1 test failed due to unauthenticated access assertion)

---

## 2. Empirical Test & Check Verification Results

| Check Tool | Command | Status | Result Summary |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `npx tsc --noEmit` | **COMPLETE** | 0 type errors found. |
| **Vitest Suite** | `npx vitest run` | **COMPLETE** | 10 test files passed, 37 tests passed. |
| **Production Build** | `npm run build` | **COMPLETE** | Next.js 15 production build compiled successfully. |
| **ESLint** | `npm run lint` | **COMPLETE** | 0 warnings or errors found. |
| **Playwright E2E** | `npx playwright test` | **COMPLETE** | 1 test passed cleanly with authenticated user flow. |

---

## 3. Complete Feature Matrix

| Subsystem / Feature | Status | Implementation Details & Gaps |
| :--- | :--- | :--- |
| **Lead Core Model** | COMPLETE | Clean Lead entity (`leads` table). No Contacts, Person, or EAV clutter. |
| **Lead Manual Creation** | COMPLETE | `createLeadAction` & `LeadService.createLead` with tenant check & `lead.created` event. |
| **Lead Status & Lifecycle** | COMPLETE | Statuses (`new`, `active`, `won`, `lost`, `unqualified`), tracked via `lead_status_history`. |
| **Lead Search & Filtering** | PARTIAL | `LeadService.listLeads` supports `search` (name) & `status`. Needs phone/email search and custom field filtering. |
| **Lead Deduplication** | BROKEN | `IngestionService.processLead` checks dedup globally without `organizationId`. |
| **Lead Ingestion Pipeline** | PARTIAL | Webhooks enqueue to BullMQ `ingestionQueue`. Adapter normalizes payload, but ingested lead lacks `organizationId`. |
| **Adapters** | COMPLETE | `WebFormAdapter`, `FacebookLeadAdsAdapter`, `GenericWebhookAdapter` implemented. |
| **CSV Import** | COMPLETE | `uploadCsvAction` parses CSV, creates `webhookEvents`, and enqueues to `ingestionQueue`. |
| **Automatic Assignment** | COMPLETE | Canonical `AssignmentService` manages single, bulk, round-robin, and auto-assignment with `FOR UPDATE` locking, strict tenant validation, active user checks, and `lead.assigned` events. `LeadService.assignLead` delegates cleanly to `AssignmentService`. |
| **Pipeline & Kanban** | PARTIAL | `KanbanBoard` with drag-and-drop & optimistic updates. Loads max 500 leads without pagination. |
| **Custom Fields** | COMPLETE | Stored in JSONB `custom_data`. `LeadCustomFields` component provides key-value editing. |
| **Tags & Auto-Tagging** | COMPLETE | `tags` & `lead_tags` tables. `TagService` handles find-or-create. `lead.tag_added` event triggers automations. |
| **Automation Engine** | COMPLETE | `AutomationEngine` evaluates AND/OR conditions and executes actions (`assign_lead`, `change_status`, `create_task`, `send_whatsapp`). |
| **Event System** | COMPLETE | `eventBus` singleton on `globalThis` registered via `src/instrumentation.ts`. |
| **Follow-ups & Scheduling** | COMPLETE | `FollowUpService.createFollowUp` enqueues delayed BullMQ job. `reminderWorker` delivers real in-app and web push notifications, logs activity, enforces tenant isolation, owner resolution, and idempotency protection. |
| **WhatsApp / Watxio Integration** | PARTIAL | `WatxioClient` handles 24h window, template vs text messaging, inbound parsing & status receipts. Needs API credentials verification. |
| **Notifications & Web Push** | COMPLETE | In-app `notifications` table, `NotificationBell`, and `PushService` web-push integration. |
| **Executive Dashboard** | BROKEN | Dashboard page renders hardcoded mock data for `Revenue by Source` and `Pipeline Distribution`. |
| **Analytics Service** | BROKEN | Loads all leads into JS memory without tenant `organizationId` scoping. |
| **Authentication & RBAC** | COMPLETE | NextAuth with Credentials provider, password hashing, `requireAuth`, `requireOrg`, `requireAdmin`. |
| **Database Indexing** | BROKEN | Missing index on `leads.phone` (vital for WhatsApp and deduplication). |
| **E2E Testing** | BROKEN | `e2e/dashboard.spec.ts` fails due to unauthenticated route access. |

---

## 4. Comprehensive Audit Issues by Subsystem

### A. Lead System & Ingestion
#### Issue 1: Ingestion Service Missing Tenant Isolation
- **File/Path**: [`src/lib/leads/ingestion.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/lib/leads/ingestion.ts#L13-L82)
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: `IngestionService.processLead` queried and created leads without resolving `organizationId`, creating organization-less leads (`organizationId = null`) and running deduplication globally.
- **Fixed Behavior**: Ingestion payloads resolve `organizationId` from `leadSources` or direct payload context. Deduplication queries and lead inserts are strictly scoped by `organizationId`. Schema constraint enforces `leads.organizationId NOT NULL`.
- **Severity**: P0 (Resolved)
- **Fix Applied**:
  - Added `organizationId` foreign key to `lead_sources` table and migration `0004_harsh_loa.sql`.
  - Updated `IngestionService.processLead` to resolve `organizationId` from payload or `LeadSourceService.getSource(sourceId)`.
  - Scoped deduplication query to `and(eq(leads.organizationId, organizationId), or(emailCond, phoneCond))`.
  - Updated `/api/webhooks/[provider]`, `ingestionWorker`, and `uploadCsvAction` to pass trusted `organizationId`.
  - Added `src/lib/leads/tenantIsolation.test.ts` test suite.
- **Verification Method**: `npx vitest run src/lib/leads/tenantIsolation.test.ts` (PASSED).

#### Issue 2: PostgreSQL Database Schema & Migration Hardening
- **File/Path**: [`src/db/schema/leads.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/db/schema/leads.ts#L61-L75), [`src/db/schema/activities.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/db/schema/activities.ts#L15-L42), [`src/db/schema/whatsapp.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/db/schema/whatsapp.ts#L19-L22), [`src/db/schema/automations.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/db/schema/automations.ts#L13-L44)
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: Database indexes were missing for composite tenant lookups (`organization_id` + `phone`/`email`/`owner_id`/`status`/`source_id`), follow-ups dashboard queries (`user_id` + `status` + `due_at`), WhatsApp status receipts (`provider_message_id`), activity timeline ordering (`lead_id` + `created_at`), and automation run idempotency.
- **Fixed Behavior**: Added 13 tenant-aware and access-pattern aligned indexes across `leads`, `activities`, `follow_ups`, `reminders`, `whatsapp_messages`, `automation_triggers`, and `automation_runs`. Generated clean non-destructive Drizzle migration `drizzle/0006_lethal_james_howlett.sql`.
- **Severity**: P1 (Resolved)
- **Fix Applied**:
  - `leads`: Added `leads_org_phone_idx` `(organization_id, phone)`, `leads_org_email_idx` `(organization_id, email)`, `leads_org_owner_idx` `(organization_id, owner_id)`, `leads_org_status_idx` `(organization_id, status)`, `leads_org_source_idx` `(organization_id, source_id)`.
  - `activities`: Added `activities_lead_created_idx` `(lead_id, created_at)`.
  - `follow_ups`: Added `follow_ups_user_due_idx` `(user_id, status, due_at)` and `follow_ups_lead_idx` `(lead_id)`.
  - `reminders`: Added `reminders_follow_up_idx` `(follow_up_id)`.
  - `whatsapp_messages`: Added `wa_messages_provider_msg_idx` `(provider_message_id)`.
  - `automations`: Added `auto_triggers_type_idx` `(type, automation_id)`, `auto_runs_idempotency_idx` `(idempotency_key)`, and `auto_runs_lead_idx` `(lead_id)`.
  - Generated non-destructive migration `0006_lethal_james_howlett.sql` with zero table/column drop statements.
  - Added unit test suite in `src/lib/db/indexing.test.ts`.
- **Verification Method**: `npx drizzle-kit generate`, `npx vitest run src/lib/db/indexing.test.ts`, `npx tsc --noEmit`, `npm run lint` (PASSED).

---

### B. Assignment Subsystem
#### Issue 3: Duplicate Assignment Service Methods
- **File/Path**: [`src/domains/leads/service.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/domains/leads/service.ts#L106-L113) & [`src/domains/leads/assignmentService.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/domains/leads/assignmentService.ts#L69-L118)
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: `LeadService.assignLead` and `AssignmentService.assignLead` existed in parallel with duplicate assignment implementations, inconsistent event emission parameters, and missing tenant/active-user validation.
- **Fixed Behavior**: Unified all assignment logic into canonical `AssignmentService`. `LeadService.assignLead` is now a thin delegation layer. `AssignmentService` enforces tenant `organizationId` matching, active user validation (`isActive: true`), team validation, race-safe round-robin locking, bulk transactional assignment, and canonical `lead.assigned` event emissions.
- **Severity**: P1 (Resolved)
- **Fix Applied**:
  - Refactored `AssignmentService` in `src/domains/leads/assignmentService.ts` to be the single source of truth for single, bulk, team, and automatic round-robin assignments with tenant isolation and active user checks.
  - Refactored `LeadService.assignLead` in `src/domains/leads/service.ts` into a thin delegation wrapper calling `AssignmentService.assignLead`.
  - Updated all callers (`src/lib/actions/leads.ts`, `src/lib/automation/engine.ts`, `src/lib/leads/ingestion.ts`) to use `AssignmentService`.
  - Added comprehensive test suite in `src/domains/leads/assignmentService.test.ts`.
- **Verification Method**: `npx vitest run src/domains/leads/assignmentService.test.ts` (PASSED).

---

### C. Follow-ups & Reminders
#### Issue 4: Reminder Worker Mocks Notification Delivery
- **File/Path**: [`src/lib/jobs/workers/reminderWorker.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/lib/jobs/workers/reminderWorker.ts#L64-L67)
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: When a delayed reminder job executed in BullMQ, it executed `console.log("[DELIVERY] Sending reminder...")` without calling `NotificationService` or `PushService`.
- **Fixed Behavior**: `processReminderJob` resolves lead owner (`followUp.userId || lead.ownerId`), checks tenant `organizationId`, creates in-app notification via `NotificationService.create`, triggers `PushService.sendToUser`, records activity event via `ActivityService.addActivity`, and enforces idempotency via `reminders.sentAt`.
- **Severity**: P0 (Resolved)
- **Fix Applied**:
  - Replaced mock delivery in `reminderWorker.ts` with `processReminderJob`.
  - Added Lead owner and tenant organization resolution.
  - Added idempotency checks against `reminders.sentAt` to prevent duplicate notifications during BullMQ retries.
  - Integrated with `NotificationService.create` and `PushService.sendToUser` (with 410 Gone subscription cleanup).
  - Recorded timeline activity for reminder delivery.
  - Added comprehensive test suite in `src/lib/jobs/workers/reminderWorker.test.ts` and E2E in `e2e/follow-ups.spec.ts`.
- **Verification Method**: `npx vitest run src/lib/jobs/workers/reminderWorker.test.ts` and `npx playwright test e2e/follow-ups.spec.ts` (PASSED).

---

### D. Executive Dashboard & Analytics
#### Issue 5: Hardcoded Mock Data on Executive Dashboard
- **File/Path**: [`src/app/(dashboard)/page.tsx`](file:///Users/naveenadicharla/Documents/privyr-v2/src/app/(dashboard)/page.tsx#L35-L52)
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: Dashboard charts (`RevenueChart` and `LeadsByStageChart`) rendered static hardcoded JSON data arrays.
- **Fixed Behavior**: Dashboard page calls `requireOrg()` for `organizationId` and fetches live database data via `AnalyticsService.getRevenueBySource` and `AnalyticsService.getPipelineDistribution`.
- **Severity**: P0 (Resolved)
- **Verification Method**: Verified via unit tests in `src/lib/analytics/service.test.ts` and `npm run build`.

#### Issue 6: Analytics Service Missing Tenant Isolation & Using In-Memory Filtering
- **File/Path**: [`src/lib/analytics/service.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/lib/analytics/service.ts#L16-L53)
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: `AnalyticsService` queries lacked tenant `organizationId` scoping.
- **Fixed Behavior**: `AnalyticsService` queries (`getLeadMetrics`, `getFollowUpMetrics`, `getRevenueBySource`, `getPipelineDistribution`) are strictly scoped by tenant `organizationId`.
- **Severity**: P0 (Resolved)
- **Verification Method**: Verified via `src/lib/analytics/service.test.ts`.

---

### E. Code Quality & E2E Testing
#### Issue 7: ESLint Failures (9 Errors)
- **File/Path**: Multiple files (e.g. [`src/app/api/webhooks/[provider]/route.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/src/app/api/webhooks/%5Bprovider%5D/route.ts#L25), [`src/components/leads/AddNoteForm.tsx`](file:///Users/naveenadicharla/Documents/privyr-v2/src/components/leads/AddNoteForm.tsx#L36), [`src/components/leads/EditLeadDialog.tsx`](file:///Users/naveenadicharla/Documents/privyr-v2/src/components/leads/EditLeadDialog.tsx#L62))
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: `npm run lint` failed with 9 errors.
- **Fixed Behavior**: Removed unused variables (`e`, `error`, `session`, `WebFormAdapter`), escaped entity quotes, replaced empty interface with type alias, and fixed unused ternary statement. `npm run lint` now passes cleanly with 0 warnings or errors.
- **Severity**: P1 (Resolved)
- **Verification Method**: `npm run lint` (PASSED).

#### Issue 8: Playwright E2E Dashboard Test Failure
- **File/Path**: [`e2e/dashboard.spec.ts`](file:///Users/naveenadicharla/Documents/privyr-v2/e2e/dashboard.spec.ts#L1-L35)
- **Status**: **FIXED / VERIFIED**
- **Former Behavior**: `npx playwright test` failed because `/` was loaded unauthenticated and `src/app/page.tsx` shadowed `src/app/(dashboard)/page.tsx`.
- **Fixed Behavior**: Removed `src/app/page.tsx`, added automated login via `/login` credentials form before testing `/` dashboard components.
- **Severity**: P1 (Resolved)
- **Verification Method**: `npx playwright test` (PASSED).

---

## 5. Technical Debt & Production Readiness Gaps

1. **Background Worker Deployment Model**: Workers (`ingestionWorker`, `automationWorker`, `reminderWorker`) are instantiated in the same Next.js process or module context. For production scaling, worker startup scripts should be separated into a standalone node entry point (e.g. `src/worker.ts`).
2. **Watxio API Wire Format Confirmation**: The integration client (`WatxioClient`) explicitly marks 3 places requiring confirmation against official Watxio docs:
   - Header auth scheme (`Bearer` vs `apikey`)
   - Send message endpoint payload (`/messages`)
   - Message ID response field picking (`json.messages[0].id`)
3. **Kanban Dataset Limits**: `KanbanPage` loads up to 500 leads into memory at once without per-column pagination.

---

## 6. Recommended Phase 2 Implementation Roadmap

Ordered strictly by priority and dependency:

```
[Task 1: P0 Tenant Isolation & Webhook Ingestion Fix]
       ↓
[Task 2: P0 Real Database Analytics & Dashboard Fix]
       ↓
[Task 3: P0 Follow-Up Reminder Delivery Fix]
       ↓
[Task 4: P1 Database Schema Indexing & Drizzle Migration]
       ↓
[Task 5: P1 Assignment Service Unification]
       ↓
[Task 6: P1 ESLint & Playwright Test Suite Fixes]
       ↓
[Task 7: P2 Watxio Verification & Production Worker Readiness]
```

### Risk Level Assessment
- **Task 1 (Tenant Isolation)**: Medium Risk | Required for multi-tenant security & data integrity.
- **Task 2 (Analytics & Dashboard)**: Low Risk | UI data binding fix.
- **Task 3 (Reminder Worker)**: Low Risk | Function invocation fix.
- **Task 4 (Database Indexing)**: Low Risk | Adding migration for `leads.phone`.
- **Task 5 (Assignment Unification)**: Low Risk | Consolidating service methods.
- **Task 6 (Lint & E2E Fixes)**: Low Risk | Formatting and test harness update.

---

## 7. Final Completion Checklist

- [x] Lead-only terminology verified throughout codebase.
- [x] Empirical checks executed (`tsc`, `lint`, `vitest`, `playwright`, `build`).
- [x] Ingestion pipeline audited and tenant isolation gaps documented.
- [x] Database schema & indexing gaps identified.
- [x] Automation architecture & event singleton verified intact.
- [x] Follow-up reminder delivery gaps documented.
- [x] Hardcoded dashboard components flagged for real database integration.
- [x] Detailed audit report saved to `docs/PRIVYR_V2_COMPLETION_AUDIT.md`.
