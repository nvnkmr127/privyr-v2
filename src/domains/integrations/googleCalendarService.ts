import { db } from "@/db";
import { googleCredentials } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as google from "@/lib/integrations/google";

export class GoogleCalendarService {
  static async isConnected(userId: string) {
    const [row] = await db.select({ userId: googleCredentials.userId }).from(googleCredentials).where(eq(googleCredentials.userId, userId)).limit(1);
    return Boolean(row);
  }

  // Persist tokens from the OAuth callback. Keeps the existing refresh token if Google omits one.
  static async connect(userId: string, tokens: { access_token: string; refresh_token?: string; expires_in: number }) {
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);
    const [existing] = await db.select({ refreshToken: googleCredentials.refreshToken }).from(googleCredentials).where(eq(googleCredentials.userId, userId)).limit(1);
    const refreshToken = tokens.refresh_token ?? existing?.refreshToken ?? null;

    if (existing) {
      await db.update(googleCredentials)
        .set({ accessToken: tokens.access_token, refreshToken, expiryDate, updatedAt: new Date() })
        .where(eq(googleCredentials.userId, userId));
    } else {
      await db.insert(googleCredentials).values({ userId, accessToken: tokens.access_token, refreshToken, expiryDate });
    }
  }

  static async disconnect(userId: string) {
    await db.delete(googleCredentials).where(eq(googleCredentials.userId, userId));
  }

  // Returns a valid access token, refreshing it if expired (or about to). Null if not connected.
  private static async validToken(userId: string) {
    const [cred] = await db.select().from(googleCredentials).where(eq(googleCredentials.userId, userId)).limit(1);
    if (!cred) return null;

    const stillValid = cred.expiryDate && cred.expiryDate.getTime() - Date.now() > 60_000;
    if (stillValid) return { accessToken: cred.accessToken, calendarId: cred.calendarId };

    if (!cred.refreshToken) return { accessToken: cred.accessToken, calendarId: cred.calendarId };
    const refreshed = await google.refreshAccessToken(cred.refreshToken);
    await db.update(googleCredentials)
      .set({ accessToken: refreshed.access_token, expiryDate: new Date(Date.now() + refreshed.expires_in * 1000), updatedAt: new Date() })
      .where(eq(googleCredentials.userId, userId));
    return { accessToken: refreshed.access_token, calendarId: cred.calendarId };
  }

  // Best-effort: create a calendar event for the user. Returns false if not connected/unconfigured.
  static async createEvent(userId: string, event: { summary: string; description?: string; start: Date; end: Date; attendeeEmail?: string }) {
    if (!google.isConfigured()) return false;
    try {
      const token = await this.validToken(userId);
      if (!token) return false;
      await google.insertEvent(token.accessToken, token.calendarId, event);
      return true;
    } catch (e) {
      console.error("[google-calendar] event create failed", e);
      return false;
    }
  }
}
