import { db } from "@/db";
import { organizations, users, roles } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/permissions";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "org";
}

export class OrgService {
  // The two shared system roles live once with organizationId = null. Idempotent: creates them
  // if missing (keeping admin's permission list current), returns the admin role.
  static async ensureSystemRoles() {
    for (const name of ["admin", "member"] as const) {
      const [existing] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.name, name), isNull(roles.organizationId)))
        .limit(1);
      const permissions = SYSTEM_ROLE_PERMISSIONS[name] ?? [];
      if (!existing) {
        await db.insert(roles).values({ name, organizationId: null, permissions });
      } else if (name === "admin") {
        await db.update(roles).set({ permissions }).where(eq(roles.id, existing.id));
      }
    }
    const [adminRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, "admin"), isNull(roles.organizationId)))
      .limit(1);
    return adminRole;
  }

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

    const adminRole = await OrgService.ensureSystemRoles();

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

  static async getOrganization(organizationId: string) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return org;
  }

  static async updateOrganization(
    organizationId: string,
    data: Partial<{
      name: string;
      timezone: string;
      locale: string;
      currency: string;
      dateFormat: string;
      industry: string | null;
      phone: string | null;
      website: string | null;
      addressLine1: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
      requiredLeadFields: string[];
      slaHours: number | null;
      whatsappMode: string;
    }>,
  ) {
    const [updated] = await db
      .update(organizations)
      .set(data)
      .where(eq(organizations.id, organizationId))
      .returning();
    return updated;
  }
}

