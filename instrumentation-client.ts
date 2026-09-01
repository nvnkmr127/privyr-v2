import * as Sentry from "@sentry/nextjs";

// Browser Sentry init. DSN is project-public; NEXT_PUBLIC_SENTRY_DSN overrides it per-environment.
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://3685ec78475851b19d5e7d0914dc8476@o4511992072175616.ingest.us.sentry.io/4511992073814016";

Sentry.init({
  dsn: DSN,
  enabled: !!DSN,
  // Error monitoring only. Browser tracing is disabled because @sentry/nextjs@10's bundled
  // web-vitals reporter throws "Cannot read properties of undefined (reading 'startTime')" in
  // reportAllChanges. Dropping the BrowserTracing integration (and tracesSampleRate:0) removes
  // that crash while keeping exception capture. Re-enable perf tracing after a Sentry upgrade fixes it.
  tracesSampleRate: 0,
  integrations: (defaults) => defaults.filter((i) => i.name !== "BrowserTracing"),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});

// Lets Sentry trace client-side navigations in the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
