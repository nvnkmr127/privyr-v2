import { describe, expect, it } from "vitest";
import { MetaTokenRefreshService } from "./metaTokenRefreshService";

describe("MetaTokenRefreshService", () => {
  it("should exchange short-lived Meta token for a long-lived 60-day access token", async () => {
    const res = await MetaTokenRefreshService.exchangeShortLivedToken("short_token_xyz123");

    expect(res.accessToken).toContain("long_lived");
    expect(res.tokenType).toBe("bearer");
    expect(res.expiresInSeconds).toBe(5184000); // 60 days
    expect(res.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("should fetch a permanent Page Access Token for a target Facebook page", async () => {
    const pageToken = await MetaTokenRefreshService.fetchPageAccessToken("long_lived_user_token", "page_12345");

    expect(pageToken.pageId).toBe("page_12345");
    expect(pageToken.pageAccessToken).toBe("EAAK_page_page_12345_token");
  });

  it("should correctly detect if a Meta OAuth access token is expiring within buffer threshold", () => {
    const expiringAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days remaining
    const isExpiring = MetaTokenRefreshService.isTokenExpiringSoon(expiringAt, 7);
    expect(isExpiring).toBe(true);

    const validAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days remaining
    const isValid = MetaTokenRefreshService.isTokenExpiringSoon(validAt, 7);
    expect(isValid).toBe(false);
  });
});
