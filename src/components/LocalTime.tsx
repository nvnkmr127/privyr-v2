"use client";

import * as React from "react";

// Server components format dates in the server's timezone (UTC on the host), so timestamps render
// wrong for the viewer. This renders the time in the BROWSER's timezone after mount. The pre-mount
// text is the UTC ISO (stable across SSR and first client render, so no hydration mismatch); it is
// replaced with the viewer's local time once mounted.
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [local, setLocal] = React.useState<string | null>(null);
  React.useEffect(() => {
    setLocal(new Date(iso).toLocaleString());
  }, [iso]);
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {local ?? iso.replace("T", " ").replace(/:\d\d\.\d+Z$/, " UTC")}
    </time>
  );
}
