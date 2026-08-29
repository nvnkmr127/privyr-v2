import crypto from "crypto";

// Self-contained HS256 JWT for the mobile app — signed with NEXTAUTH_SECRET, no extra deps.
// NextAuth's own tokens are encrypted JWE (cookie-bound); native clients need a plain bearer token,
// so we mint/verify our own here. Used by /api/v1/auth/login (mint) and the /api/v1 routes (verify).
const SECRET = process.env.NEXTAUTH_SECRET || "";

export interface MobileTokenPayload {
  sub: string;            // userId
  org: string;            // organizationId
  role: string | null;   // roleId
  email: string;
  iat?: number;
  exp?: number;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

export function signMobileToken(payload: Omit<MobileTokenPayload, "iat" | "exp">, expiresInSec = 60 * 60 * 24 * 30) {
  if (!SECRET) throw new Error("NEXTAUTH_SECRET is not set");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const sig = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  if (!token || !SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  const expected = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as MobileTokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
