# Target Architecture Overview

## 1. Core Technology Stack
- **Frontend & Backend Framework:** Next.js (App Router)
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **UI & Styling:** Tailwind CSS + shadcn/ui
- **Forms & Validation:** React Hook Form + Zod
- **State Management:** TanStack Query (Server State), Zustand (Client State)
- **Background Jobs:** Redis + BullMQ
- **Authentication/Authorization:** Auth.js (NextAuth) or Lucia with RBAC
- **Storage:** S3-Compatible Storage
- **Testing:** Vitest (Unit/Integration) + Playwright (E2E)

## 2. Architectural Paradigm: Modular Monolith
The application will be built as a **Modular Monolith** within a single Next.js codebase. We are moving away from unnecessary microservices and avoiding the fragmented MVC layout of the legacy Laravel package system. Instead, the codebase is organized by strict **Domain Boundaries**.

### Recommended Domain Boundaries
- `Lead` (Core center of the application)
- `Pipeline` (Stages, Workflows)
- `Activity` (Notes, Calls, Meetings, Emails)
- `FollowUp` (Reminders, Schedules)
- `Automation` (Triggers, Actions)
- `LeadSource` (Channels, Integrations)
- `Assignment` (Rules, Round-Robin)
- `Tag` (Categorization)
- `CustomField` (Flattened dynamic data)
- `User` (Agents, Managers)
- `Role` (RBAC)
- `Team` (Grouping)
- `Notification` (In-app, Push)
- `Integration` (Third-party services)
- `Reporting` (Metrics, Conversion Rates)
- `Settings` (Global Configuration)

## 3. Product Philosophy: Lead-Centric Design
Every architectural decision MUST support the core Lead Lifecycle:
1. **Capture:** Ingest from WebForms, Integrations, and Manual Entry.
2. **Qualify:** Assess fit via Custom Fields and Scoring.
3. **Assign:** Route to the right User/Team using Automation/Assignment Rules.
4. **Follow up:** Schedule and track Activities and Reminders.
5. **Nurture:** Automated Sequences, Emails.
6. **Convert:** Pipeline progression to Won/Lost.
7. **Measure:** Reporting on sources, speeds, and conversions.

No generic CRM constructs (Contacts, Organizations) will be created. A `Lead` is the primary business entity from capture to conversion.
