import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import crypto from "crypto";

function hash(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export class ApiKeyService {
  static async list(organizationId: string) {
    return db
      .select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, organizationId))
      .orderBy(desc(apiKeys.createdAt));
  }

  // Returns the raw key ONCE — it is never retrievable again (only its hash is stored).
  static async create(organizationId: string, name: string, createdById: string) {
    const raw = `pk_${crypto.randomBytes(24).toString("hex")}`;
    const [row] = await db
      .insert(apiKeys)
      .values({ organizationId, name, keyHash: hash(raw), prefix: raw.slice(0, 12), createdById })
      .returning({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix });
    return { ...row, key: raw };
  }

  static async revoke(organizationId: string, id: string) {
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)));
  }

  // Resolve a raw bearer key to its org. Returns null if unknown or revoked. Touches lastUsedAt.
  static async verify(raw: string): Promise<{ organizationId: string } | null> {
    if (!raw?.startsWith("pk_")) return null;
    const [row] = await db
      .select({ id: apiKeys.id, organizationId: apiKeys.organizationId })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash(raw)), isNull(apiKeys.revokedAt)))
      .limit(1);
    if (!row) return null;
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
    return { organizationId: row.organizationId };
  }
}
