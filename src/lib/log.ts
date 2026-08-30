import { randomUUID } from "crypto";

// Minimal structured server-side error logger with correlation ids.
//
// Generates a short reference id, logs the FULL error server-side (never to the client), and
// returns the id so callers can show it to users ("Ref: ab12cd34") and match a user report to a
// log line. No external monitoring dependency — this is the single place to swap the
// console sink for Sentry/OTel when one is added.
// ponytail: console sink; wire a real monitor here (one place) if/when it's needed.
export function logError(context: string, error: unknown, extra?: Record<string, unknown>): string {
  const ref = randomUUID().slice(0, 8);
  const base =
    error instanceof Error
      ? { message: error.message, stack: error.stack, code: (error as { code?: unknown }).code }
      : { value: String(error) };
  // Never log secrets: callers must not pass tokens/passwords in `extra`.
  console.error(`[error] ${context} ref=${ref}`, JSON.stringify({ ref, ...base, ...extra }));
  return ref;
}
