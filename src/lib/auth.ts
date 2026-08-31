import { NextAuthOptions, DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string | null;
      organizationId: string | null;
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    roleId: string | null;
    organizationId: string | null;
    isSuperAdmin: boolean;
  }
}

import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.isActive) return null;

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) return null;

        // Block sign-in for a suspended org (super-admins are exempt — they operate cross-tenant).
        if (user.organizationId && !user.isSuperAdmin) {
          const [org] = await db
            .select({ suspendedAt: organizations.suspendedAt })
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1);
          if (org?.suspendedAt) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          roleId: user.roleId,
          organizationId: user.organizationId,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleId = user.roleId;
        token.organizationId = user.organizationId;
        token.isSuperAdmin = user.isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          roleId: token.roleId as string,
          organizationId: (token.organizationId as string) ?? null,
          isSuperAdmin: Boolean(token.isSuperAdmin),
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
