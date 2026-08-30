import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signMobileToken } from "@/lib/mobileAuth";
import { RateLimiter } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Native login: verify credentials (same bcrypt store as NextAuth) and return a bearer token.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const limit = await RateLimiter.checkLimit(`auth:login:${ip}`, 10, 60);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a minute before trying again." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.limit.toString(),
          "X-RateLimit-Remaining": limit.remaining.toString(),
          "X-RateLimit-Reset": limit.reset.toString(),
        },
      }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password format" }, { status: 422 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  // Same generic error whether the email is unknown or the password is wrong — don't leak which.
  if (!user || !user.isActive || !user.organizationId) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = signMobileToken({ sub: user.id, org: user.organizationId, role: user.roleId, email: user.email });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      organizationId: user.organizationId,
    },
  });
}
