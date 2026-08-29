import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/login" } });

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
