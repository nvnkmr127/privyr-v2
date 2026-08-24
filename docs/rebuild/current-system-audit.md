# Current System Architecture Audit

## A. Existing architecture
- Framework: Laravel (PHP)
- UI: Blade templates + Vue components + DataGrids
- Architecture Style: Modular Monolith (domain-driven packaging under `packages/Webkul`)

## B. Existing modules
- API, Activity, Admin, Attribute, Automation, Core, DataGrid, DataTransfer
- Email, EmailTemplate, Installer, Lead, Marketing, Tag, User, WebForm

## C. Existing features
- Lead Management, Pipelines, Stages, Assignments, Qualifications
- Activity Tracking (Emails, Notes, Meetings, Calls)
- User Authentication, Roles, Permissions (ACL)
- DataGrids (Filtering, Sorting, Mass Actions)
- Automations & Workflows
- Tags & Custom Attributes (EAV system)
- WebForms for lead generation

## D. Existing database entities
- Users, Roles, Permissions
- Leads, LeadAssignments, Pipelines, Stages, Sources
- LeadNurtureEnrollment, LeadScoreLog, LeadStatusHistory, LeadCaptureLog
- Activities (Notes, Emails, Calls, Meetings)
- Tags, Attributes, AttributeValues

## E. Existing workflows
- Lead Capture -> Qualification -> Pipeline Management -> Conversion/Closure
- Automated Lead Assignment rules
- Email parsing and automation rules

## F. Existing integrations
- Mail/SMTP settings
- Third-party lead source connectors

## G. Existing permissions
- Role-based Access Control (RBAC) bound to Laravel gates and middleware.
- Scoped data access (User, Group, Global).

## H. Existing frontend architecture
- Laravel Blade views serving as the structural skeleton.
- Vue.js integrated for dynamic reactivity within Blade.
- Highly reliant on server-rendered HTML chunks and DataGrid AJAX reloads.

## I. Existing backend architecture
- Service Repository Pattern: Controllers inject Repositories.
- Strict contracts/interfaces for all models and repositories.
- Extensive use of Laravel Events and Observers for decoupled logic.

## J. Features worth preserving
- Lead pipeline structure (Stages, Sources, Pipelines).
- Robust User, Role, and Permission mechanisms.
- Activity feed and note-taking logic.
- Lead capture and basic automation/assignment rules.

## K. Features to redesign
- The entire frontend: Move to a decoupled Single Page Application (SPA) using React/Next.js.
- The generic EAV structure: Flatten custom attributes where possible for better performance.
- Database Schema: Simplify entity relations to be exclusively Lead-centric.
- API layer: Redesign into a strict REST or GraphQL API for the new frontend.

## L. Features to remove
- Blade templates, Vue 2.x/3.x legacy components.
- Generic CRM constructs (Contacts, Organizations, Quotes, Products).
- Obsolete DataGrid server-side rendering logic.

## M. Features currently coupled to Contacts/Persons
- Activities and Emails often link to Persons. These will need to be re-wired directly to Leads.
- Addresses and organizational context currently living in generic B2B CRM domains.

## N. Features dependent on EAV
- Leads heavily utilize EAV (Entity-Attribute-Value) for custom fields, causing complex joins and slow DataGrid performance.

## O. Technical debt
- Deep inheritance in Repositories.
- Over-engineered proxies for Models (`LeadProxy`, `StageProxy`).
- Intertwined UI rendering and business logic in Admin controllers.

## P. Hidden dependencies
- Event listeners silently modifying lead states (e.g., `lead.create.after`).
- Polymorphic relations in Activities linking to undefined/removed models.

## Q. Migration risks
- Untangling EAV values into a more structured or JSON column format.
- Preserving historical data like LeadStageHistory and LeadStatusHistory.
- Handling in-flight automations and queued jobs during transition.

## R. Data migration requirements
- Extract Contacts/Persons data and merge relevant data into the primary Lead entity.
- Map old pipeline stages to the newly strictly-defined workflows.
- Flatten Custom Attributes into a new unified `leads.custom_data` column or similar.

## S. Recommended rebuild boundaries
1. Extract API into strict endpoints (no Blade/Session dependency).
2. Establish a new frontend repository/app interacting strictly over API.
3. Migrate Data first, establishing the new Lead-centric schema.
4. Port Business Logic (Automations, Assignments, SLA) to pure backend services.
