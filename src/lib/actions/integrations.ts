"use server";

import { requireAuth } from "@/lib/rbac";
import { GoogleCalendarService } from "@/domains/integrations/googleCalendarService";
import { revalidatePath } from "next/cache";

export async function disconnectGoogleAction() {
  const session = await requireAuth();
  await GoogleCalendarService.disconnect(session.user.id);
  revalidatePath("/settings/integrations");
  return { ok: true };
}
