"use server";

import { requireAuth } from "@/lib/rbac";
import { NotificationService } from "@/domains/notifications/service";
import { revalidatePath } from "next/cache";

export async function listNotificationsAction(unreadOnly = false) {
  const session = await requireAuth();
  return NotificationService.listForUser(session.user.id, { unreadOnly });
}

export async function unreadCountAction() {
  const session = await requireAuth();
  return NotificationService.unreadCount(session.user.id);
}

export async function markNotificationsReadAction(ids?: string[]) {
  const session = await requireAuth();
  await NotificationService.markRead(session.user.id, ids);
  revalidatePath("/");
}
