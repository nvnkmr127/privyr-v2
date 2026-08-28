import { db } from "@/db";
import { users, leads, invitations, organizations } from "@/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";

// Per-plan ceilings. Infinity = unlimited. Enforcement lives here; charging (Stripe) is separate
// and needs external keys — the plan column is set by that flow, which isn't wired yet.
export const PLAN_LIMITS: Record<string, { seats: number; leads: number }> = {
  free: { seats: 3, leads: 500 },
  pro: { seats: 15, leads: 25_000 },
  business: { seats: Infinity, leads: Infinity },
};

function limitsFor(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export class PlanService {
  private static async plan(organizationId: string) {
    const [org] = await db.select({ plan: organizations.plan }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    return org?.plan ?? "free";
  }

  // Counts active users + still-open invitations against the seat limit.
  static async assertCanAddSeat(organizationId: string) {
    const { seats } = limitsFor(await this.plan(organizationId));
    if (seats === Infinity) return;
    const [u] = await db.select({ n: count() }).from(users).where(and(eq(users.organizationId, organizationId), isNull(users.deletedAt)));
    const [i] = await db.select({ n: count() }).from(invitations).where(and(eq(invitations.organizationId, organizationId), isNull(invitations.acceptedAt)));
    if (Number(u.n) + Number(i.n) >= seats) {
      throw new Error(`Your plan allows ${seats} seats. Upgrade to add more.`);
    }
  }

  static async assertCanAddLead(organizationId: string) {
    const { leads: max } = limitsFor(await this.plan(organizationId));
    if (max === Infinity) return;
    const [l] = await db.select({ n: count() }).from(leads).where(eq(leads.organizationId, organizationId));
    if (Number(l.n) >= max) {
      throw new Error(`Your plan allows ${max} leads. Upgrade to add more.`);
    }
  }
}
