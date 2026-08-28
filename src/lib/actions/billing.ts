"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { BillingService } from "@/domains/billing/service";
import { AuditService } from "@/domains/audit/service";
import { verifyPaymentSignature, isConfigured } from "@/lib/billing/razorpay";
import { PLAN_LIMITS } from "@/domains/billing/planService";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getBillingAction() {
  const { organizationId } = await requireOrg();
  const billing = await BillingService.get(organizationId);
  return { ...billing, configured: isConfigured(), limits: PLAN_LIMITS };
}

export async function startSubscriptionAction(plan: string) {
  const { organizationId, userId } = await requirePermission("billing.manage");
  const result = await BillingService.startSubscription(organizationId, plan);
  await AuditService.log({ organizationId, userId, action: "billing.subscribe_start", entityType: "organization", entityId: organizationId, metadata: { plan } });
  return result; // { subscriptionId, keyId }
}

const verifySchema = z.object({
  plan: z.string(),
  subscriptionId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

// Called by the checkout success handler. We re-verify the signature server-side before granting anything.
export async function verifySubscriptionAction(input: z.infer<typeof verifySchema>) {
  const { organizationId, userId } = await requirePermission("billing.manage");
  const data = verifySchema.parse(input);

  const ok = verifyPaymentSignature({ paymentId: data.paymentId, subscriptionId: data.subscriptionId, signature: data.signature });
  if (!ok) throw new Error("Payment verification failed");

  await BillingService.activate(organizationId, data.plan, data.subscriptionId);
  await AuditService.log({ organizationId, userId, action: "billing.subscribe_activate", entityType: "organization", entityId: organizationId, metadata: { plan: data.plan } });
  revalidatePath("/settings/billing");
  return { ok: true };
}

export async function cancelSubscriptionAction() {
  const { organizationId, userId } = await requirePermission("billing.manage");
  await BillingService.cancel(organizationId);
  await AuditService.log({ organizationId, userId, action: "billing.cancel", entityType: "organization", entityId: organizationId });
  revalidatePath("/settings/billing");
  return { ok: true };
}
