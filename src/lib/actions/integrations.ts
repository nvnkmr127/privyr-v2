"use server";

import { requireAuth } from "@/lib/rbac";
import { GoogleCalendarService } from "@/domains/integrations/googleCalendarService";
import { revalidatePath } from "next/cache";
import { ok, actionFail } from "@/lib/actions/result";

export async function disconnectGoogleAction() {
  const session = await requireAuth();
  try {
    await GoogleCalendarService.disconnect(session.user.id);
    revalidatePath("/settings/integrations");
    return ok({ disconnected: true });
  } catch (e) {
    return actionFail(e);
  }
}
