import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { MetaTokenRefreshService } from "@/domains/leads/metaTokenRefreshService";
import { LeadSourceService } from "@/domains/leads/sourceService";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const state = searchParams.get("state"); // Organization ID or CSRF state

  if (error || errorReason) {
    console.error("[META_OAUTH_CALLBACK_ERROR]", error, errorReason);
    return NextResponse.redirect(new URL("/settings/integrations?error=oauth_denied", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings/integrations?error=missing_code", req.url));
  }

  // Honest gate: without real Meta app credentials we cannot connect a Page. Don't fake it.
  if (!MetaTokenRefreshService.isConfigured()) {
    console.warn("[META_OAUTH_CALLBACK] Facebook integration not configured — set FACEBOOK_APP_ID / FACEBOOK_APP_SECRET");
    return NextResponse.redirect(new URL("/settings/integrations?error=facebook_not_configured", req.url));
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/facebook/callback`;

    // 1. Exchange OAuth code → short-lived user token.
    const shortLived = await MetaTokenRefreshService.exchangeCodeForToken(code, redirectUri);

    // 2. Short-lived → long-lived (60-day) user token.
    const longLivedResult = await MetaTokenRefreshService.exchangeShortLivedToken(shortLived.accessToken);

    // 3. Fetch the connected Page access token. `state` carries the target page/org context.
    const pageId = searchParams.get("pageId") || state || "";
    const pageTokenResult = await MetaTokenRefreshService.fetchPageAccessToken(
      longLivedResult.accessToken,
      pageId
    );

    // Persist the connection as a lead source for the signed-in user's org so leadgen webhooks
    // from this Page are attributed and can be pulled. Bound to the session, not the (untrusted) state.
    const session = await getServerSession(authOptions);
    const organizationId = session?.user?.organizationId;
    if (organizationId) {
      await LeadSourceService.upsertFacebookPageSource(organizationId, {
        pageId: pageTokenResult.pageId,
        pageAccessToken: pageTokenResult.pageAccessToken,
        expiresAt: longLivedResult.expiresAt,
      });
    }

    console.log(
      `[META_OAUTH_CALLBACK_SUCCESS] Connected Page ${pageTokenResult.pageId} (Org: ${organizationId ?? "none"})`
    );

    // Construct fallback redirect URL
    const redirectUrl = new URL("/settings/integrations?status=facebook_connected", req.url);
    redirectUrl.searchParams.set("pageId", pageTokenResult.pageId);
    redirectUrl.searchParams.set("expiresAt", longLivedResult.expiresAt.toISOString());

    // If popup mode is active, execute postMessage handshake with parent window
    const isPopup = searchParams.get("popup") === "true";
    if (isPopup) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Authorization Successful</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: "OAUTH_RESPONSE",
                  provider: "facebook",
                  status: "success",
                  data: {
                    pageId: "${pageTokenResult.pageId}",
                    expiresAt: "${longLivedResult.expiresAt.toISOString()}"
                  }
                }, window.location.origin);
                window.close();
              } else {
                window.location.href = "${redirectUrl.toString()}";
              }
            </script>
          </body>
        </html>
      `;
      return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
    }

    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error("[META_OAUTH_CALLBACK_EXCEPTION]", err);
    return NextResponse.redirect(new URL("/settings/integrations?error=server_error", req.url));
  }
}
