# Database Architecture

## 1. Core Stack
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Migrations:** Managed via Drizzle Kit

## 2. Lead-Centric Design
Unlike the legacy system, there are no generic `Contacts` or `Organizations`. The `Lead` table is the central hub.

### Core Tables
- `leads`: id, first_name, last_name, email, phone, company, status, pipeline_id, stage_id, source_id, owner_id, team_id, created_at, updated_at
- `activities`: id, lead_id, type (email, call, meeting, note), content, scheduled_at, completed_at, user_id
- `pipelines` & `stages`: Manage the state machine of a Lead.
- `tags` & `lead_tags`: Many-to-many categorization.

## 3. Handling Custom Data (Removing EAV)
The legacy system relied heavily on a slow, generic EAV (Entity-Attribute-Value) model for custom attributes.
In the new architecture:
- Utilize PostgreSQL's **JSONB** column type in the `leads` table (`custom_data: jsonb`) for dynamic fields.
- A `custom_fields` table will define the schema, type, and validation rules for the JSONB data, allowing dynamic UI rendering without complex SQL joins.

## 4. Multi-Tenancy / Scoping
If required, scoping will be handled via `tenant_id` or `workspace_id` columns on all major tables, enforced strictly via Row Level Security (RLS) in Postgres or at the Drizzle query level.

## 5. Performance Considerations
- Foreign Keys and Indexes on all lookup columns (e.g., `lead_id`, `owner_id`, `email`).
- JSONB GIN indexes on `custom_data` to allow fast querying of custom fields.
