import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

// Expo push: mobile counterpart to the web-push PushService. Best-effort — never throws into callers.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export const ExpoPushService = {
  // Upsert a device token (token is unique; re-registering the same device just refreshes it).
  async register(userId: string, organizationId: string, token: string, platform?: string) {
    await db
      .insert(deviceTokens)
      .values({ userId, organizationId, token, platform })
      .onConflictDoUpdate({
        target: deviceTokens.token,
        set: { userId, organizationId, platform, updatedAt: new Date() },
      });
  },

  async remove(token: string) {
    await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
  },

  async sendToUser(userId: string, message: ExpoPushMessage) {
    try {
      const rows = await db.select({ token: deviceTokens.token }).from(deviceTokens).where(eq(deviceTokens.userId, userId));
      if (rows.length === 0) return;

      const messages = rows.map((r) => ({
        to: r.token,
        title: message.title,
        body: message.body ?? "",
        data: message.data ?? {},
        sound: "default",
      }));

      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });

      // Expo returns per-message receipts; a DeviceNotRegistered error means we should drop the token.
      const json: any = await res.json().catch(() => null);
      const receipts: any[] = json?.data ?? [];
      await Promise.all(
        receipts.map((rcpt, i) =>
          rcpt?.details?.error === "DeviceNotRegistered" ? ExpoPushService.remove(messages[i].to) : Promise.resolve()
        )
      );
    } catch (e) {
      console.error("[expo-push] send failed", e);
    }
  },
};
