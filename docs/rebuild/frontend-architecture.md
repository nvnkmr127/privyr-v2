# Frontend Architecture

## 1. Core Framework
- **Framework:** React within Next.js App Router.
- **Rendering:** Utilize React Server Components (RSC) for initial page loads and SEO (though this is an internal dashboard, RSC provides excellent performance and reduced client bundle sizes). Client Components (`"use client"`) will be used strictly for interactive elements (modals, forms, complex UI state).

## 2. Styling & UI Components
- **Styling:** Tailwind CSS for utility-first styling.
- **Component Library:** shadcn/ui. This provides accessible, customizable base components (Radix UI) without abstracting away the code. We own the components.
- **Design Language:** Modern, clean, and highly responsive.

## 3. Form Handling & Validation
- **Library:** React Hook Form.
- **Validation:** Zod schemas. The exact same Zod schemas used on the backend for API/Server Action validation will be shared with the frontend for client-side validation, ensuring single-source-of-truth.

## 4. State Management
- **Server State (Data Fetching):** TanStack Query (React Query). Handles caching, background updates, and stale-data invalidation for data fetched from the API.
- **Client State (Global UI State):** Zustand. Only used where absolutely necessary (e.g., global UI toggles, complex multi-step wizards, or managing a persistent Kanban board state across layout navigations). Avoid putting Server State into Zustand.

## 5. Domain Organization
The `app/` directory will be structured logically around domains.
Components should be co-located with their respective routes where possible, or placed in a strictly organized `components/` directory structured by domain (e.g., `components/leads/LeadCard.tsx`).
