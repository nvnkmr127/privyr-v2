import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PLAN_LIMITS } from "./planService";
import * as razorpay from "@/lib/billing/razorpay";

// Which plan a Razorpay subscription status maps the org to. Paid tiers only apply while active.
const PAID_PLANS = Object.keys(PLAN_LIMITS).filter((p) => p !== "free");

export class BillingService {
  static async get(organizationId: string) {
    const [org] = await db
      .select({ plan: organizations.plan, planStatus: organizations.planStatus, currentPeriodEnd: organizations.currentPeriodEnd, subscriptionId: organizations.razorpaySubscriptionId })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return org;
  }

  // Create a Razorpay subscription for a paid plan; store it as pending. Returns what the
  // browser checkout needs. Entitlements DON'T change until payment is verified/activated.
  static async startSubscription(organizationId: string, plan: string) {
    if (!PAID_PLANS.includes(plan)) throw new Error("Unknown plan");
    if (!razorpay.isConfigured()) throw new Error("Billing is not configured");
    const planId = razorpay.RAZORPAY_PLAN_IDS[plan];
    if (!planId) throw new Error(`No Razorpay plan_id configured for "${plan}"`);

    const sub = await razorpay.createSubscription(planId);
    await db.update(organizations)
      .set({ razorpaySubscriptionId: sub.id, planStatus: "created" })
      .where(eq(organizations.id, organizationId));

    return { subscriptionId: sub.id, keyId: razorpay.publicKeyId(), shortUrl: sub.short_url };
  }

  // Called after the browser verifies the checkout signature — flips the org to the paid plan.
  static async activate(organizationId: string, plan: string, subscriptionId: string) {
    if (!PAID_PLANS.includes(plan)) throw new Error("Unknown plan");
    await db.update(organizations)
      .set({ plan, planStatus: "active", razorpaySubscriptionId: subscriptionId })
      .where(eq(organizations.id, organizationId));
  }

  static async cancel(organizationId: string) {
    const org = await this.get(organizationId);
    if (org?.subscriptionId && razorpay.isConfigured()) {
      await razorpay.cancelSubscription(org.subscriptionId);
    }
    await db.update(organizations)
      .set({ plan: "free", planStatus: "cancelled" })
      .where(eq(organizations.id, organizationId));
  }

  // Reconcile from a verified webhook. Razorpay is the source of truth for the subscription state.
  static async handleWebhook(event: string, subscriptionEntity: { id?: string; current_end?: number } | undefined) {
    const subId = subscriptionEntity?.id;
    if (!subId) return;
    const [org] = await db.select({ id: organizations.id, plan: organizations.plan }).from(organizations).where(eq(organizations.razorpaySubscriptionId, subId)).limit(1);
    if (!org) return;

    const periodEnd = subscriptionEntity.current_end ? new Date(subscriptionEntity.current_end * 1000) : undefined;

    switch (event) {
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.resumed":
        await db.update(organizations)
          .set({ planStatus: "active", ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}) })
          .where(eq(organizations.id, org.id));
        break;
      case "subscription.halted":
      case "subscription.paused":
        await db.update(organizations).set({ planStatus: "halted" }).where(eq(organizations.id, org.id));
        break;
      case "subscription.cancelled":
      case "subscription.completed":
        // Lost the paid subscription → drop entitlements back to free.
        await db.update(organizations).set({ plan: "free", planStatus: "cancelled" }).where(eq(organizations.id, org.id));
        break;
    }
  }
}
