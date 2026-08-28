import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function hash(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const TTL_DAYS = 7;

export class InvitationService {
  static async list(organizationId: string) {
    return db
      .select({ id: invitations.id, email: invitations.email, roleId: invitations.roleId, acceptedAt: invitations.acceptedAt, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt })
      .from(invitations)
      .where(eq(invitations.organizationId, organizationId))
      .orderBy(invitations.createdAt);
  }

  // Creates a pending invite and returns the raw token (embed it in the accept link).
  static async create(organizationId: string, email: string, roleId: string | null, invitedById: string) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new Error("A user with that email already exists");

    const raw = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.insert(invitations).values({ organizationId, email, roleId, invitedById, tokenHash: hash(raw), expiresAt });
    return { token: raw };
  }

  // Public: show who/what an invite is for, without leaking whether the token is otherwise valid.
  static async peek(rawToken: string) {
    const [inv] = await db
      .select({ email: invitations.email, organizationId: invitations.organizationId })
      .from(invitations)
      .where(and(eq(invitations.tokenHash, hash(rawToken)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())))
      .limit(1);
    return inv ?? null;
  }

  // Accepts an invite: creates the user in the org with the invited role, then burns the token.
  static async accept(rawToken: string, input: { password: string; firstName?: string; lastName?: string }) {
    const [inv] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.tokenHash, hash(rawToken)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())))
      .limit(1);
    if (!inv) throw new Error("This invitation is invalid or has expired");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        organizationId: inv.organizationId,
        email: inv.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: inv.roleId,
        isActive: true,
      })
      .returning({ id: users.id, email: users.email });

    await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id));
    return user;
  }
}
