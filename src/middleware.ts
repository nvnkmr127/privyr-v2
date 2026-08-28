import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default function middleware(req: any) {
  if (process.env.BYPASS_AUTH === "true") {
    return NextResponse.next();
  }
  return (withAuth({ pages: { signIn: "/login" } }) as any)(req);
}

export const config = {
  matcher: [
    "/",
    "/leads/:path*",
    "/automations/:path*",
    "/follow-ups/:path*",
    "/my-dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
