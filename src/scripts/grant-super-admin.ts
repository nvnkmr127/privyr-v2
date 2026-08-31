import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Grant (or revoke) platform super-admin by email.
//   npx tsx -r dotenv/config src/scripts/grant-super-admin.ts you@example.com
//   npx tsx -r dotenv/config src/scripts/grant-super-admin.ts you@example.com --revoke
async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!email) {
    console.error("Usage: tsx -r dotenv/config src/scripts/grant-super-admin.ts <email> [--revoke]");
    process.exit(1);
  }
  const [u] = await db
    .update(users)
    .set({ isSuperAdmin: !revoke, updatedAt: new Date() })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email });

  console.log(u ? `${revoke ? "Revoked" : "Granted"} super-admin: ${u.email}` : `No user found with email ${email}`);
  process.exit(u ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
