import { db } from "@/db";
import { customFieldDefs } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type CustomFieldType = "text" | "number" | "date" | "select";

function slugify(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "field";
}

export class CustomFieldService {
  static async list(organizationId: string) {
    return db
      .select()
      .from(customFieldDefs)
      .where(eq(customFieldDefs.organizationId, organizationId))
      .orderBy(asc(customFieldDefs.orderIndex), asc(customFieldDefs.createdAt));
  }

  static async create(
    organizationId: string,
    input: { label: string; type: CustomFieldType; options?: string[]; required?: boolean },
  ) {
    const [row] = await db
      .insert(customFieldDefs)
      .values({
        organizationId,
        key: slugify(input.label),
        label: input.label,
        type: input.type,
        options: input.type === "select" ? (input.options ?? []) : [],
        required: input.required ?? false,
      })
      .returning();
    return row;
  }

  static async remove(organizationId: string, id: string) {
    await db.delete(customFieldDefs).where(and(eq(customFieldDefs.id, id), eq(customFieldDefs.organizationId, organizationId)));
  }

  // Validates a custom_data payload against this org's field defs. Returns cleaned values.
  static async validate(organizationId: string, data: Record<string, unknown> = {}) {
    const defs = await this.list(organizationId);
    const clean: Record<string, unknown> = {};
    for (const def of defs) {
      const raw = data[def.key];
      const empty = raw === undefined || raw === null || raw === "";
      if (empty) {
        if (def.required) throw new Error(`Missing required field: ${def.label}`);
        continue;
      }
      if (def.type === "number" && isNaN(Number(raw))) throw new Error(`${def.label} must be a number`);
      if (def.type === "select" && (def.options ?? []).length && !(def.options ?? []).includes(String(raw))) {
        throw new Error(`${def.label} must be one of: ${(def.options ?? []).join(", ")}`);
      }
      clean[def.key] = def.type === "number" ? Number(raw) : raw;
    }
    return clean;
  }
}
