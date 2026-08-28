import { db } from "@/db";
import { customStatusConfigs } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

export type StatusCategory = "open" | "in_progress" | "won" | "lost" | "unqualified";

export interface CustomStatusItem {
  id?: string;
  key: string;
  label: string;
  color: string;
  category: StatusCategory;
  orderIndex: number;
  isSystemDefault: boolean;
}

export const DEFAULT_SYSTEM_STATUSES: CustomStatusItem[] = [
  { key: "new", label: "New", color: "#3B82F6", category: "open", orderIndex: 1, isSystemDefault: true },
  { key: "active", label: "Active", color: "#10B981", category: "in_progress", orderIndex: 2, isSystemDefault: true },
  { key: "won", label: "Won", color: "#059669", category: "won", orderIndex: 3, isSystemDefault: true },
  { key: "lost", label: "Lost", color: "#EF4444", category: "lost", orderIndex: 4, isSystemDefault: true },
  { key: "unqualified", label: "Unqualified", color: "#6B7280", category: "unqualified", orderIndex: 5, isSystemDefault: true },
];

export class CustomStatusSchemaService {
  /**
   * Retrieves tenant status schema configuration, seeding default statuses if none exist yet.
   */
  static async getTenantStatusSchema(organizationId: string): Promise<CustomStatusItem[]> {
    const existing = await db
      .select({
        id: customStatusConfigs.id,
        key: customStatusConfigs.key,
        label: customStatusConfigs.label,
        color: customStatusConfigs.color,
        category: customStatusConfigs.category,
        orderIndex: customStatusConfigs.orderIndex,
        isSystemDefault: customStatusConfigs.isSystemDefault,
      })
      .from(customStatusConfigs)
      .where(eq(customStatusConfigs.organizationId, organizationId))
      .orderBy(asc(customStatusConfigs.orderIndex));

    if (existing.length > 0) {
      return existing.map((s) => ({
        id: s.id,
        key: s.key,
        label: s.label,
        color: s.color,
        category: s.category as StatusCategory,
        orderIndex: s.orderIndex,
        isSystemDefault: s.isSystemDefault === 1,
      }));
    }

    // Seed defaults
    const seedValues = DEFAULT_SYSTEM_STATUSES.map((s) => ({
      organizationId,
      key: s.key,
      label: s.label,
      color: s.color,
      category: s.category,
      orderIndex: s.orderIndex,
      isSystemDefault: 1,
    }));

    await db.insert(customStatusConfigs).values(seedValues);

    return DEFAULT_SYSTEM_STATUSES;
  }

  /**
   * Upserts or creates a custom status for a tenant organization.
   */
  static async addOrUpdateStatus(
    organizationId: string,
    statusItem: { key: string; label: string; color: string; category: StatusCategory; orderIndex?: number }
  ): Promise<CustomStatusItem> {
    const cleanKey = statusItem.key.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");

    const [existing] = await db
      .select()
      .from(customStatusConfigs)
      .where(
        and(
          eq(customStatusConfigs.organizationId, organizationId),
          eq(customStatusConfigs.key, cleanKey)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(customStatusConfigs)
        .set({
          label: statusItem.label,
          color: statusItem.color,
          category: statusItem.category,
          orderIndex: statusItem.orderIndex ?? existing.orderIndex,
        })
        .where(eq(customStatusConfigs.id, existing.id))
        .returning();

      return {
        id: updated.id,
        key: updated.key,
        label: updated.label,
        color: updated.color,
        category: updated.category as StatusCategory,
        orderIndex: updated.orderIndex,
        isSystemDefault: updated.isSystemDefault === 1,
      };
    }

    const [created] = await db
      .insert(customStatusConfigs)
      .values({
        organizationId,
        key: cleanKey,
        label: statusItem.label,
        color: statusItem.color,
        category: statusItem.category,
        orderIndex: statusItem.orderIndex ?? 10,
        isSystemDefault: 0,
      })
      .returning();

    return {
      id: created.id,
      key: created.key,
      label: created.label,
      color: created.color,
      category: created.category as StatusCategory,
      orderIndex: created.orderIndex,
      isSystemDefault: false,
    };
  }

  /**
   * Deletes a custom status (system defaults cannot be deleted).
   */
  static async deleteCustomStatus(organizationId: string, statusKey: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(customStatusConfigs)
      .where(
        and(
          eq(customStatusConfigs.organizationId, organizationId),
          eq(customStatusConfigs.key, statusKey)
        )
      )
      .limit(1);

    if (!existing) return false;
    if (existing.isSystemDefault === 1) {
      throw new Error("System default statuses cannot be deleted.");
    }

    await db
      .delete(customStatusConfigs)
      .where(eq(customStatusConfigs.id, existing.id));

    return true;
  }
}
