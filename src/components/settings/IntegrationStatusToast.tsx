"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// The OAuth callbacks redirect back here with a result in the query string (Google always; Facebook
// only when the popup was blocked and it fell back to a redirect). Without this, those outcomes —
// especially failures — were silent. Toast once, then strip the params so a refresh won't re-toast.
const GOOGLE: Record<string, { ok?: boolean; title: string; desc?: string }> = {
  connected: { ok: true, title: "Google Calendar connected" },
  error: { title: "Google Calendar connection failed", desc: "Something went wrong. Please try again." },
  invalid_state: { title: "Google Calendar connection failed", desc: "The session expired — please try connecting again." },
};
const FB_ERROR: Record<string, string> = {
  oauth_denied: "You cancelled or denied the Facebook permission request.",
  missing_code: "Facebook didn't return an authorization code. Please try again.",
  facebook_not_configured: "Facebook isn't fully configured on the server (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET).",
  server_error: "Something went wrong completing the connection. Please try again.",
  no_pages: "No Facebook Pages found on your account. Create or get admin access to a Page, then reconnect.",
};

export function IntegrationStatusToast() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    let handled = false;

    const g = params.get("google");
    if (g && GOOGLE[g]) {
      const m = GOOGLE[g];
      toast(m.ok ? { title: m.title } : { variant: "destructive", title: m.title, description: m.desc });
      handled = true;
    }

    const fbErr = params.get("error");
    const fbStatus = params.get("status");
    if (fbErr && FB_ERROR[fbErr]) {
      toast({ variant: "destructive", title: "Facebook connection failed", description: FB_ERROR[fbErr] });
      handled = true;
    } else if (fbStatus === "facebook_connected") {
      toast({ title: "Facebook Lead Ads connected" });
      handled = true;
    }

    if (handled) router.replace("/settings/integrations");
    // Run once on mount — the params are consumed immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
