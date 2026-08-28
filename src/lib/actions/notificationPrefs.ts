"use server";

import { requireAuth } from "@/lib/rbac";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// The email-eligible notification types users can mute, with display labels.
export const EMAIL_NOTIFICATION_TYPES: { type: string; label: string }[] = [
  { type: "new_lead", label: "New lead assigned or received" },
  { type: "lead_assigned", label: "A lead is assigned to you" },
  { type: "follow_up_due", label: "Follow-up due" },
  { type: "follow_up_overdue", label: "Follow-up overdue" },
  { type: "sla_escalation", label: "SLA escalation (unactioned lead)" },
];

export async function getEmailOptOutAction() {
  const session = await requireAuth();
  const [u] = await db.select({ emailOptOut: users.emailOptOut }).from(users).where(eq(users.id, session.user.id)).limit(1);
  return u?.emailOptOut ?? [];
}

export async function setEmailOptOutAction(optOut: string[]) {
  const session = await requireAuth();
  const allowed = new Set(EMAIL_NOTIFICATION_TYPES.map((t) => t.type));
  const clean = z.array(z.string()).parse(optOut).filter((t) => allowed.has(t));
  await db.update(users).set({ emailOptOut: clean, updatedAt: new Date() }).where(eq(users.id, session.user.id));
  revalidatePath("/profile");
  return clean;
}
