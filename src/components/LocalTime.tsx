"use client";

import * as React from "react";

export type LocalTimeMode = "time" | "date" | "datetime" | "shortDate" | "full";

export interface LocalTimeProps {
  iso: string | Date | null | undefined;
  mode?: LocalTimeMode;
  className?: string;
  fallback?: string;
}

/**
 * Normalizes a Date or date string to a valid Date object.
 * If given a SQL-style string without timezone (e.g. "2026-09-10 14:30:00"),
 * it correctly treats it as UTC rather than ambiguous browser local time.
 */
export function parseAsUtcDate(d: Date | string | null | undefined): Date {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d === "string") {
    const trimmed = d.trim();
    if (!trimmed) return new Date();
    // If it lacks timezone indicator (Z or +/-offset), treat as UTC
    if (!trimmed.endsWith("Z") && !trimmed.includes("+") && !/[+-]\d{2}:\d{2}$/.test(trimmed)) {
      return new Date(trimmed.replace(" ", "T") + "Z");
    }
    return new Date(trimmed);
  }
  return new Date(d);
}

export function formatLocalDateTime(
  d: Date | string | null | undefined,
  mode: LocalTimeMode = "datetime"
): string {
  if (!d) return "";
  const date = parseAsUtcDate(d);
  if (Number.isNaN(date.getTime())) return "";

  switch (mode) {
    case "time":
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    case "date":
      return date.toLocaleDateString(undefined, { dateStyle: "medium" });
    case "shortDate":
      return date.toLocaleDateString(undefined, { dateStyle: "short" });
    case "full":
      return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    case "datetime":
    default:
      return `${date.toLocaleDateString(undefined, { dateStyle: "short" })} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
}

// Server components format dates in the server's timezone (UTC on the host), so timestamps render
// wrong for the viewer. This renders the time in the BROWSER's timezone after mount.
export function LocalTime({ iso, mode = "datetime", className, fallback = "" }: LocalTimeProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!iso) return <span className={className}>{fallback}</span>;

  const date = parseAsUtcDate(iso);
  if (Number.isNaN(date.getTime())) return <span className={className}>{fallback}</span>;

  const isoStr = iso instanceof Date ? iso.toISOString() : String(iso);
  const formatted = formatLocalDateTime(date, mode);

  return (
    <time dateTime={isoStr} className={className} suppressHydrationWarning>
      {mounted ? formatted : (fallback || formatted)}
    </time>
  );
}

