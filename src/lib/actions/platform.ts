"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/rbac";
import { PlatformService } from "@/domains/platform/service";
import { AuditService } from "@/domains/audit/service";
import { ok, fail, actionFail } from "@/lib/actions/result";

const IMPERSONATE_COOKIE = "impersonate_org";

export async function listOrganizationsAction() {
  await requireSuperAdmin();
  return PlatformService.listOrganizations();
}

const planSchema = z.object({ organizationId: z.string().uuid(), plan: z.enum(["free", "pro", "business"]) });

export async function setOrgPlanAction(input: z.infer<typeof planSchema>) {
  const session = await requireSuperAdmin();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Choose a valid plan.");
  try {
    const row = await PlatformService.setPlan(parsed.data.organizationId, parsed.data.plan);
    if (!row) return fail("NOT_FOUND", "That organization no longer exists.");
    await AuditService.log({
      organizationId: parsed.data.organizationId,
      userId: session.user.id,
      action: "platform.set_plan",
      entityType: "organization",
      entityId: parsed.data.organizationId,
      metadata: { plan: parsed.data.plan, by: "super_admin" },
    });
    revalidatePath("/admin");
    return ok({ plan: parsed.data.plan });
  } catch (e) {
    return actionFail(e);
  }
}

export async function setOrgSuspendedAction(organizationId: string, suspended: boolean) {
  const session = await requireSuperAdmin();
  if (!z.string().uuid().safeParse(organizationId).success) return fail("VALIDATION", "Invalid organization.");
  try {
    const row = await PlatformService.setSuspended(organizationId, suspended);
    if (!row) return fail("NOT_FOUND", "That organization no longer exists.");
    await AuditService.log({
      organizationId,
      userId: session.user.id,
      action: suspended ? "platform.suspend" : "platform.reactivate",
      entityType: "organization",
      entityId: organizationId,
      metadata: { by: "super_admin" },
    });
    revalidatePath("/admin");
    return ok({ suspended });
  } catch (e) {
    return actionFail(e);
  }
}

// Start impersonating a tenant: a super-admin then operates inside that org via the normal UI.
export async function impersonateOrgAction(organizationId: string) {
  const session = await requireSuperAdmin();
  if (!z.string().uuid().safeParse(organizationId).success) return fail("VALIDATION", "Invalid organization.");
  const org = await PlatformService.getOrg(organizationId);
  if (!org) return fail("NOT_FOUND", "That organization no longer exists.");

  (await cookies()).set(IMPERSONATE_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4, // 4h safety cap
  });
  await AuditService.log({
    organizationId,
    userId: session.user.id,
    action: "platform.impersonate_start",
    entityType: "organization",
    entityId: organizationId,
    metadata: { by: "super_admin" },
  });
  return ok({ organizationId, name: org.name });
}

export async function stopImpersonationAction() {
  const session = await requireSuperAdmin();
  const store = await cookies();
  const current = store.get(IMPERSONATE_COOKIE)?.value;
  store.delete(IMPERSONATE_COOKIE);
  if (current) {
    await AuditService.log({
      organizationId: current,
      userId: session.user.id,
      action: "platform.impersonate_stop",
      entityType: "organization",
      entityId: current,
      metadata: { by: "super_admin" },
    });
  }
  revalidatePath("/", "layout");
  return ok({ stopped: true });
}
