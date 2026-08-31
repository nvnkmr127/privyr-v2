"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { EmailSettingsService } from "@/domains/organizations/emailSettingsService";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, actionFail, zodFieldErrors } from "@/lib/actions/result";

export async function getEmailSettingsAction() {
  const { organizationId } = await requirePermission("settings.manage");
  return EmailSettingsService.getView(organizationId);
}

const schema = z.object({
  fromName: z.string().trim().max(255).optional().or(z.literal("")),
  fromEmail: z.string().trim().email("Enter a valid from-address").optional().or(z.literal("")),
  smtpHost: z.string().trim().max(255).optional().or(z.literal("")),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().max(255).optional().or(z.literal("")),
  smtpPassword: z.string().max(512).optional(), // blank = keep existing
  enabled: z.boolean().optional(),
});

export async function updateEmailSettingsAction(input: z.infer<typeof schema>) {
  const { organizationId } = await requirePermission("settings.manage");
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  const d = parsed.data;

  // Turning it on requires a complete config.
  if (d.enabled) {
    const missing = !d.smtpHost || !d.smtpPort || !d.smtpUser || !d.fromEmail;
    const existing = await EmailSettingsService.getView(organizationId);
    const willHavePassword = (d.smtpPassword && d.smtpPassword.length > 0) || existing.hasPassword;
    if (missing || !willHavePassword) {
      return fail("VALIDATION", "To enable sending, fill in host, port, username, password and from-email.");
    }
  }

  try {
    const view = await EmailSettingsService.upsert(organizationId, {
      fromName: d.fromName || null,
      fromEmail: d.fromEmail || null,
      smtpHost: d.smtpHost || null,
      smtpPort: d.smtpPort ?? null,
      smtpSecure: d.smtpSecure,
      smtpUser: d.smtpUser || null,
      smtpPassword: d.smtpPassword,
      enabled: d.enabled,
    });
    revalidatePath("/settings/email");
    return ok(view);
  } catch (e) {
    return actionFail(e);
  }
}

export async function sendTestEmailAction() {
  const { organizationId, userId } = await requirePermission("settings.manage");
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.email) return fail("VALIDATION", "Your account has no email address to send the test to.");
  try {
    await EmailSettingsService.sendTest(organizationId, u.email);
    return ok({ sentTo: u.email });
  } catch (e) {
    // Surface the SMTP error text so the tenant can fix host/port/credentials.
    const msg = e instanceof Error ? e.message : "SMTP send failed";
    return fail("SERVER", `Test failed: ${msg}`);
  }
}
