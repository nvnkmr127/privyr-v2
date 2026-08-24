# API Architecture

## 1. Next.js Route Handlers & Server Actions
The API layer will heavily leverage Next.js App Router capabilities:
- **Server Actions:** Primarily used for internal mutations triggered directly from the React frontend (e.g., updating a lead status, submitting a form). They provide end-to-end type safety without boilerplate API setup.
- **Route Handlers (`app/api/...`):** Used for RESTful API endpoints. Required for:
  - Third-party Webhook ingestion (Lead Capture).
  - External system integrations (Zapier, external frontends).
  - WebForms form submissions from external sites.

## 2. API Design Principles
- **RESTful standard:** Use standard HTTP methods (GET, POST, PUT, PATCH, DELETE) and status codes.
- **Validation:** All incoming payloads to Route Handlers and Server Actions MUST be validated using **Zod** schemas.
- **Authentication:** Middleware and Route Handler checks will verify JWT/Session tokens.
- **Rate Limiting:** Implement rate limiting (via Redis) on public-facing endpoints (e.g., WebForms, Webhooks) to prevent abuse.

## 3. OpenAPI Documentation
For the REST API portions (Route Handlers), we will maintain OpenAPI specifications.
- **Tooling:** Use libraries like `@asteasolutions/zod-to-openapi` to derive API specifications directly from our Zod validation schemas, ensuring the docs never drift from the code.
- **Exposure:** Expose a `/api/docs` route serving Swagger UI or ReDoc.

## 4. API Domain Structure
Endpoints will be strictly namespaced by domain:
- `/api/leads`
- `/api/activities`
- `/api/webhooks/capture`
- `/api/pipelines`
