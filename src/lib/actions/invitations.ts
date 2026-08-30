"use server";

import { requirePermission } from "@/lib/rbac";
import { InvitationService } from "@/domains/invitations/service";
import { AuditService } from "@/domains/audit/service";
import { PlanService } from "@/domains/billing/planService";
import { sendEmail, appUrl } from "@/lib/mail/mailer";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ok, fail, actionFail, zodFieldErrors } from "@/lib/actions/result";

const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid().nullable().optional(),
});

export async function inviteUserAction(input: z.infer<typeof inviteSchema>) {
  const { organizationId, userId } = await requirePermission("users.manage");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Please enter a valid email address.", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;

  try {
    await PlanService.assertCanAddSeat(organizationId);

    const { token } = await InvitationService.create(organizationId, data.email, data.roleId ?? null, userId);
    const link = appUrl(`/invite/${token}`);

    await sendEmail({
      to: data.email,
      subject: "You've been invited to Privyr",
      html: `<p>You've been invited to join a Privyr workspace.</p><p><a href="${link}">Accept your invitation</a> (expires in 7 days).</p>`,
    });
    await AuditService.log({ organizationId, userId, action: "user.invite", entityType: "invitation", metadata: { email: data.email } });

    revalidatePath("/settings/users");
    return ok({ sent: true });
  } catch (e) {
    return actionFail(e);
  }
}

// Public — used by the /invite/[token] accept page. No auth: the token IS the credential.
const acceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
});

export async function acceptInvitationAction(input: z.infer<typeof acceptSchema>) {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Please choose a password of at least 6 characters.", zodFieldErrors(parsed.error));
  }
  try {
    await InvitationService.accept(parsed.data.token, parsed.data);
    return ok({ accepted: true });
  } catch (e) {
    // Invalid/expired/already-used token surfaces here.
    const msg = e instanceof Error ? e.message : "";
    if (/expired|invalid|not found|used|already/i.test(msg)) {
      return fail("NOT_FOUND", "This invitation is invalid or has expired. Ask an admin to send a new one.");
    }
    return actionFail(e);
  }
}
