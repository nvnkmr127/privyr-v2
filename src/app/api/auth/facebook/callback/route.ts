import { NextRequest, NextResponse } from "next/server";
import { MetaTokenRefreshService } from "@/domains/leads/metaTokenRefreshService";

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

  try {
    // 1. Exchange OAuth code for short-lived access token
    // In production environment:
    // const appId = process.env.FACEBOOK_APP_ID;
    // const appSecret = process.env.FACEBOOK_APP_SECRET;
    // const redirectUri = `${req.nextUrl.origin}/api/auth/facebook/callback`;
    // const tokenRes = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    // const tokenData = await tokenRes.json();

    const mockShortLivedToken = `mock_st_${code}`;

    // 2. Exchange short-lived token for long-lived User Access Token (60 days)
    const longLivedResult = await MetaTokenRefreshService.exchangeShortLivedToken(mockShortLivedToken);

    // 3. Fetch connected Meta Page access tokens
    const mockPageId = "page_100200300";
    const pageTokenResult = await MetaTokenRefreshService.fetchPageAccessToken(
      longLivedResult.accessToken,
      mockPageId
    );

    console.log(
      `[META_OAUTH_CALLBACK_SUCCESS] Connected Page ${pageTokenResult.pageId} (Org state: ${state ?? "default"})`
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
