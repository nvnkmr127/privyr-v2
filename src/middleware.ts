import { withAuth } from "next-auth/middleware";

// Gate every authenticated page on a valid session token before it renders — defense in depth
// over each page's own requireOrg/requireAuth. Unauthenticated requests redirect to /login.
// Public surfaces are simply not matched: /login, /signup, /invite, /book, and all /api/* routes
// (which carry their own auth: NextAuth, API keys, or webhook signatures).
export default withAuth({
  pages: { signIn: "/login" },
});

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
