# Security Architecture

## 1. Authentication
- **Provider:** Auth.js (NextAuth) or Lucia.
- **Strategy:** Session-based authentication using HTTP-only secure cookies for the internal application. JWT for external API access (if external API tokens are provisioned).
- **Identity:** Email/Password (hashed via bcrypt/Argon2) and OAuth (Google/Microsoft) for agent login.

## 2. Authorization & RBAC
- **Role-Based Access Control (RBAC):** Users are assigned Roles (e.g., Admin, Manager, Agent).
- **Explicit Permissions:** Roles map to specific granular permissions (e.g., `lead:read`, `lead:delete`, `pipeline:manage`).
- **Implementation:** 
  - Authorization checks will be enforced at the **Server level** (in Server Actions and Route Handlers) before any database operation.
  - UI components will conditionally render based on client-side permission checks.
- **Data Scoping:** Agents should only see leads assigned to them or their team unless they have global `lead:read:all` permissions.

## 3. Data Protection
- All data in transit must be encrypted via HTTPS/TLS.
- Secrets and API keys must be stored in environment variables and never exposed to the client bundle.
- Cross-Site Request Forgery (CSRF) protection is handled natively by Next.js Server Actions/Auth.js.
- Input Sanitization: All inputs validated and sanitized via Zod. Drizzle ORM prevents SQL injection inherently.

## 4. Audit Logging
- Critical actions (Lead Export, Bulk Deletes, Settings Changes, Role modifications) must be logged in an `audit_logs` table for compliance and security review.
