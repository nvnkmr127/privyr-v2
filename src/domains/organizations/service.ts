import { db } from "@/db";
import { organizations, users, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "org";
}

export class OrgService {
  // Self-serve signup: create the org and its first user as owner (admin role), in one go.
  static async createWithOwner(input: {
    orgName: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) throw new Error("An account with that email already exists");

    // Shared role definitions — created once, reused by every org.
    await db.insert(roles).values([{ name: "admin" }, { name: "member" }]).onConflictDoNothing();
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, "admin")).limit(1);

    const slug = `${slugify(input.orgName)}-${Math.random().toString(36).slice(2, 7)}`;
    const [org] = await db.insert(organizations).values({ name: input.orgName, slug }).returning();

    const passwordHash = await bcrypt.hash(input.password, 10);
    await db.insert(users).values({
      organizationId: org.id,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId: adminRole?.id ?? null,
      isActive: true,
    });

    return { organizationId: org.id, slug };
  }
}
