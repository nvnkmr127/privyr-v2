import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { MetaTokenRefreshService } from "./metaTokenRefreshService";

describe("MetaTokenRefreshService", () => {
  const origId = process.env.FACEBOOK_APP_ID;
  const origSecret = process.env.FACEBOOK_APP_SECRET;

  afterEach(() => {
    process.env.FACEBOOK_APP_ID = origId;
    process.env.FACEBOOK_APP_SECRET = origSecret;
  });

  describe("when Facebook is not configured", () => {
    beforeEach(() => {
      delete process.env.FACEBOOK_APP_ID;
      delete process.env.FACEBOOK_APP_SECRET;
    });

    it("reports not configured", () => {
      expect(MetaTokenRefreshService.isConfigured()).toBe(false);
    });

    it("throws instead of fabricating tokens", async () => {
      await expect(MetaTokenRefreshService.exchangeShortLivedToken("x")).rejects.toThrow(/not configured/i);
      await expect(MetaTokenRefreshService.fetchPageAccessToken("t", "p")).rejects.toThrow(/not configured/i);
      await expect(MetaTokenRefreshService.exchangeCodeForToken("c", "https://app/cb")).rejects.toThrow(/not configured/i);
    });
  });

  it("treats the mock_app_id/secret fallbacks as unconfigured", () => {
    process.env.FACEBOOK_APP_ID = "mock_app_id";
    process.env.FACEBOOK_APP_SECRET = "mock_app_secret";
    expect(MetaTokenRefreshService.isConfigured()).toBe(false);
  });

  it("should correctly detect if a Meta OAuth access token is expiring within buffer threshold", () => {
    const expiringAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days remaining
    expect(MetaTokenRefreshService.isTokenExpiringSoon(expiringAt, 7)).toBe(true);

    const validAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days remaining
    expect(MetaTokenRefreshService.isTokenExpiringSoon(validAt, 7)).toBe(false);
  });
});
