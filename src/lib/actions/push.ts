"use server";

import { requireAuth } from "@/lib/rbac";
import { PushService } from "@/lib/push/service";

export async function subscribePushAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const session = await requireAuth();
  await PushService.saveSubscription(session.user.id, sub);
}

export async function unsubscribePushAction(endpoint: string) {
  const session = await requireAuth();
  await PushService.removeSubscription(endpoint, session.user.id);
}
