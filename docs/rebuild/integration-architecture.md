# Integration Architecture

## 1. Integration Philosophy
Integrations must not leak their specific schemas into the core `Lead` domain. An Anti-Corruption Layer (ACL) or adapter pattern must be used to normalize incoming data before it touches the core system.

## 2. Inbound Integrations (Lead Capture)
- **WebForms:** A lightweight, embeddable script or iframe that submits to a public Next.js API route (`/api/webforms/submit`).
- **Webhooks:** A generic `/api/webhooks/catch` endpoint that can accept payloads from platforms like Zapier or Make.com.
- **Direct API:** Authenticated REST API for custom integrations.

## 3. Outbound Integrations (Actions & Syncing)
- **Email:** The system will use a provider abstraction interface. Implementations can wrap specific APIs (Resend, SendGrid, Mailgun) or fallback to standard SMTP.
- **Storage:** S3-compatible API (AWS S3, Cloudflare R2, MinIO) for storing attachments, imported CSVs, and exported reports. No local filesystem storage will be used for persistent data.
- **Webhooks:** The system will dispatch webhooks to user-configured URLs based on Automation rules.

## 4. Extensibility
The modular monolith architecture allows for an `Integration` domain. Each specific third-party integration (e.g., `Twilio` for SMS, `GoogleCalendar` for Meetings) will be encapsulated within this domain, providing a standard interface for the core application to interact with.
