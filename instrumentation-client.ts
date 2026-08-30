import * as Sentry from "@sentry/nextjs";

// Browser Sentry init. DSN is project-public; NEXT_PUBLIC_SENTRY_DSN overrides it per-environment.
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://3685ec78475851b19d5e7d0914dc8476@o4511992072175616.ingest.us.sentry.io/4511992073814016";

Sentry.init({
  dsn: DSN,
  enabled: !!DSN,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});

// Lets Sentry trace client-side navigations in the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
