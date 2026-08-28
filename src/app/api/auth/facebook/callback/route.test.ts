import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/domains/leads/metaTokenRefreshService", () => ({
  MetaTokenRefreshService: {
    exchangeShortLivedToken: vi.fn().mockResolvedValue({
      accessToken: "long_lived_token_xyz",
      tokenType: "bearer",
      expiresInSeconds: 5184000,
      expiresAt: new Date("2026-10-28T10:00:00Z"),
    }),
    fetchPageAccessToken: vi.fn().mockResolvedValue({
      pageId: "page_100200300",
      pageAccessToken: "page_access_token_abc",
    }),
  },
}));

describe("Meta OAuth Callback Endpoint", () => {
  it("should redirect to integrations page with error if OAuth consent is denied", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/facebook/callback?error=access_denied&error_reason=user_denied");
    const res = await GET(req);

    expect(res.status).toBe(307); // Next.js redirect HTTP 307
    expect(res.headers.get("location")).toContain("/settings/integrations?error=oauth_denied");
  });

  it("should process valid authorization code, exchange long-lived token, and redirect with success status", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/facebook/callback?code=auth_code_123&state=org-999");
    const res = await GET(req);

    expect(res.headers.get("location")).toContain("/settings/integrations?status=facebook_connected");
    expect(res.headers.get("location")).toContain("pageId=page_100200300");
  });
});
