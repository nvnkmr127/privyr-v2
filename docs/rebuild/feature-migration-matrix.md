# Feature Migration Matrix

| Feature | Current Implementation | Keep | Redesign | Remove | New Architecture | Migration Priority | Dependencies | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Leads** | EAV Models + Proxies | Yes | Yes | No | Flat Schema + API | High | Core | High (Data mapping) |
| **Pipelines/Stages** | Relational Models | Yes | Yes | No | Streamlined state machine | High | Leads | Medium |
| **Activities** | Polymorphic Relations | Yes | Yes | No | Direct relation to Lead | High | Leads, Users | Low |
| **Users/Roles** | Laravel ACL | Yes | Yes | No | Token-based Auth (JWT/Sanctum) + React UI | High | None | Low |
| **Automations** | Events/Listeners/Jobs | Yes | Yes | No | Background worker/queue architecture | Medium | Queues | High (Logic translation) |
| **WebForms** | Blade Views | Yes | Yes | No | Embeddable React Widget / API endpoint | Medium | Leads | Low |
| **DataGrids** | Server-side builder + Vue | No | No | Yes | Client-side React Tables + Pagination API | High | API | Medium |
| **Tags** | M2M Relations | Yes | No | No | Direct API management | Low | Leads | Low |
| **Contacts/Persons** | Generic CRM entity | No | No | Yes | Merged directly into Lead entity | High | Leads | High (Data loss risk) |
| **Quotes/Products** | Generic CRM entity | No | No | Yes | N/A | Low | N/A | Low |
| **Blade Views** | `packages/Webkul/Admin/src/Resources/views` | No | No | Yes | Pure React Frontend (Next.js/Vite) | High | API | High (Total rewrite) |
| **EAV System** | `Attribute` Package | No | Yes | Yes | JSONB column or flattened columns | High | DB, Leads | High |
