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

const GRAPH = "https://graph.facebook.com/v20.0";

function appId(): string {
  return process.env.FACEBOOK_APP_ID || "";
}
function appSecret(): string {
  return process.env.FACEBOOK_APP_SECRET || "";
}

// Real Meta credentials present? The old "mock_app_id"/"mock_app_secret" fallbacks are treated
// as unconfigured so the flow fails honestly instead of fabricating tokens.
function isConfigured(): boolean {
  const id = appId();
  const secret = appSecret();
  return Boolean(id && secret && id !== "mock_app_id" && secret !== "mock_app_secret");
}

async function graphGet(url: string): Promise<any> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Meta Graph API error (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

function toResult(json: { access_token?: string; token_type?: string; expires_in?: number }): MetaTokenExchangeResult {
  if (!json.access_token) throw new Error("Meta did not return an access token");
  const expiresInSeconds = json.expires_in ?? 5184000; // Meta omits expires_in for some long-lived tokens
  return {
    accessToken: json.access_token,
    tokenType: json.token_type || "bearer",
    expiresInSeconds,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  };
}

export class MetaTokenRefreshService {
  static isConfigured = isConfigured;

  /** Exchanges an OAuth authorization `code` (from the redirect) for a short-lived user token. */
  static async exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaTokenExchangeResult> {
    if (!isConfigured()) throw new Error("Facebook integration is not configured");
    if (!code) throw new Error("Authorization code is required");
    const url =
      `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(appId())}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${encodeURIComponent(appSecret())}` +
      `&code=${encodeURIComponent(code)}`;
    return toResult(await graphGet(url));
  }

  /** Exchanges a short-lived user token for a long-lived (~60-day) token. */
  static async exchangeShortLivedToken(shortLivedToken: string): Promise<MetaTokenExchangeResult> {
    if (!isConfigured()) throw new Error("Facebook integration is not configured");
    if (!shortLivedToken) throw new Error("Short-lived access token is required");
    const url =
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(appId())}` +
      `&client_secret=${encodeURIComponent(appSecret())}` +
      `&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
    return toResult(await graphGet(url));
  }

  /** Fetches a (long-lived) Page Access Token using a long-lived user token. */
  static async fetchPageAccessToken(longLivedUserToken: string, pageId: string): Promise<MetaPageTokenResult> {
    if (!isConfigured()) throw new Error("Facebook integration is not configured");
    if (!longLivedUserToken || !pageId) throw new Error("Long-lived token and pageId are required");
    const url = `${GRAPH}/${encodeURIComponent(pageId)}?fields=access_token&access_token=${encodeURIComponent(longLivedUserToken)}`;
    const json = await graphGet(url);
    if (!json.access_token) throw new Error("Meta did not return a Page access token");
    return { pageId, pageAccessToken: json.access_token };
  }

  /**
   * Lists the Pages the user manages, each with its own Page access token. This is what turns a
   * user OAuth grant into a connectable lead source — /me/accounts returns id, name and access_token
   * per Page in one call, so no separate fetchPageAccessToken round trip is needed.
   */
  static async listPages(
    longLivedUserToken: string,
  ): Promise<{ pageId: string; name: string; pageAccessToken: string }[]> {
    if (!isConfigured()) throw new Error("Facebook integration is not configured");
    if (!longLivedUserToken) throw new Error("Long-lived token is required");
    const url = `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(longLivedUserToken)}`;
    const json = await graphGet(url);
    const data: any[] = Array.isArray(json?.data) ? json.data : [];
    return data
      .filter((p) => p?.id && p?.access_token)
      .map((p) => ({ pageId: String(p.id), name: String(p.name ?? p.id), pageAccessToken: String(p.access_token) }));
  }

  /** True if the token is within the refresh-warning buffer (e.g. < 7 days remaining). */
  static isTokenExpiringSoon(expiresAt: Date, bufferDays: number = 7): boolean {
    const bufferMs = bufferDays * 24 * 60 * 60 * 1000;
    return expiresAt.getTime() - Date.now() <= bufferMs;
  }
}
