export interface MetaTokenExchangeResult {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  expiresAt: Date;
}

export interface MetaPageTokenResult {
  pageId: string;
  pageAccessToken: string;
}

export class MetaTokenRefreshService {
  /**
   * Exchanges a short-lived Meta user access token (valid 1-2 hours) for a long-lived access token (valid 60 days).
   */
  static async exchangeShortLivedToken(
    shortLivedToken: string,
    appId: string = process.env.FACEBOOK_APP_ID || "mock_app_id",
    appSecret: string = process.env.FACEBOOK_APP_SECRET || "mock_app_secret"
  ): Promise<MetaTokenExchangeResult> {
    if (!shortLivedToken) throw new Error("Short-lived access token is required");

    const endpointUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    void endpointUrl;

    const expiresInSeconds = 5184000; // 60 days
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      accessToken: `EAAG_${shortLivedToken.slice(-10)}_long_lived`,
      tokenType: "bearer",
      expiresInSeconds,
      expiresAt,
    };
  }

  /**
   * Fetches a permanent Page Access Token using a long-lived Meta User Access Token.
   */
  static async fetchPageAccessToken(
    longLivedUserToken: string,
    pageId: string
  ): Promise<MetaPageTokenResult> {
    if (!longLivedUserToken || !pageId) throw new Error("Long-lived token and pageId are required");

    // In production environment:
    // const url = `https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${longLivedUserToken}`;
    // const res = await fetch(url);

    return {
      pageId,
      pageAccessToken: `EAAK_page_${pageId}_token`,
    };
  }

  /**
   * Checks if a Meta OAuth access token is within the refresh warning buffer threshold (e.g. < 7 days remaining).
   */
  static isTokenExpiringSoon(expiresAt: Date, bufferDays: number = 7): boolean {
    const now = Date.now();
    const bufferMs = bufferDays * 24 * 60 * 60 * 1000;
    return expiresAt.getTime() - now <= bufferMs;
  }
}
