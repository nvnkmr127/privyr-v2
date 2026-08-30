import * as Sentry from "@sentry/nextjs";

// Edge runtime Sentry init (middleware, edge routes). DSN is project-public; env overrides it.
const DSN =
  process.env.SENTRY_DSN ||
  "https://3685ec78475851b19d5e7d0914dc8476@o4511992072175616.ingest.us.sentry.io/4511992073814016";

Sentry.init({
  dsn: DSN,
  enabled: !!DSN,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  sendDefaultPii: false,
});
