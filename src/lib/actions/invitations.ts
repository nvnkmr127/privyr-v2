"use server";

import { requirePermission } from "@/lib/rbac";
import { InvitationService } from "@/domains/invitations/service";
import { AuditService } from "@/domains/audit/service";
import { PlanService } from "@/domains/billing/planService";
import { sendEmail, appUrl } from "@/lib/mail/mailer";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid().nullable().optional(),
});

export async function inviteUserAction(input: z.infer<typeof inviteSchema>) {
  const { organizationId, userId } = await requirePermission("users.manage");
  const data = inviteSchema.parse(input);
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
  return { ok: true };
}

// Public — used by the /invite/[token] accept page. No auth: the token IS the credential.
const acceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
});

export async function acceptInvitationAction(input: z.infer<typeof acceptSchema>) {
  const data = acceptSchema.parse(input);
  await InvitationService.accept(data.token, data);
  return { ok: true };
}
