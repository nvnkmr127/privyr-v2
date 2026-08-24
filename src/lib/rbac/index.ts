import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole() {
  const session = await requireAuth();
  
  // NOTE: In a real system, you'd fetch the user's role from the DB here
  // or store role names in the JWT. For now, we mock the validation
  // assuming the JWT contains the `roleId` and we need to check permissions.
  // Example pseudo-code:
  // const role = await db.select().from(roles).where(eq(roles.id, session.user.roleId));
  // if (!allowedRoleNames.includes(role.name)) throw new Error("Forbidden");
  
  return session;
}
