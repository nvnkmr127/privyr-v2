# Database Schema Design

This document outlines the PostgreSQL schema designed for the Lead Management product. The database is organized around the `Lead` as the core entity, explicitly moving away from generic CRM constructs like Contacts and Organizations.

## Tables & Entities

### 1. Access Control & Teams
- `users`: Core identity (id, email, password_hash, role_id, team_id, timestamps).
- `roles`: RBAC roles (id, name, description).
- `permissions`: Granular permissions (id, action).
- `role_permissions`: Mapping between roles and permissions.
- `teams`: Logical groupings for users (id, name, description).

### 2. Lead Lifecycle (Core)
- `leads`: The primary entity. Contains:
  - id, first_name, last_name, email, phone, company
  - source_id, owner_id, team_id, pipeline_id, stage_id
  - status (enum: new, active, won, lost, unqualified)
  - priority (enum: low, medium, high)
  - score, expected_value
  - custom_data (JSONB for dynamic attributes)
  - next_follow_up_at, last_contacted_at
  - created_at, updated_at
- `pipelines`: Collections of stages (id, name).
- `stages`: Workflow steps (id, pipeline_id, name, order_index).
- `lead_sources`: Origins of leads (id, name, type).

### 3. History & Tracking
- `lead_status_history`: Tracks status changes (lead_id, old_status, new_status, changed_by, changed_at).
- `lead_stage_history`: Tracks stage movements.
- `lead_assignments`: Tracks assignment routing history.

### 4. Activities & Follow-ups
- `activities`: Interactions with a lead (id, lead_id, user_id, type [email, call, meeting, note], content, occurred_at).
- `follow_ups` & `reminders`: Scheduled actions.

### 5. Categorization & Custom Data
- `tags` & `lead_tags`: Many-to-many tag relationships.
- *Custom Fields*: We utilize the `custom_data` JSONB column on the `leads` table. Optionally, a `custom_fields` table can be used to store UI definitions (schema) for the JSONB data, but data resides in `leads.custom_data`.

### 6. Automations & Notifications
- `automations`: Trigger definitions.
- `notifications`: User alerts.

### 7. Integrations
- `integrations` & `integration_events`: Webhook routing and third-party links.

## Principles Applied
- **JSONB:** Used strictly for `custom_data` on `leads` to avoid EAV joins.
- **Foreign Keys:** Enforced at the DB level for consistency.
- **Indexes:** Applied on lookup vectors (`email`, `owner_id`, `pipeline_id`).
- **Soft Deletes:** Used sparingly (e.g., on `users` or `leads`) where historical integrity is required.
