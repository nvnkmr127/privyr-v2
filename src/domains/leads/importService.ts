import { db } from "@/db";
import { leads } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

// Columns the importer understands. `name` is the only required one.
export const IMPORT_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "company", label: "Company", required: false },
  { key: "status", label: "Status", required: false },
  { key: "expectedValue", label: "Expected value", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export interface ImportRow {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  expectedValue?: string;
}

export interface ImportConfig {
  sourceId?: string | null;
  ownerId?: string | null;
  fallbackStatus?: string;
}

export interface AnalyzedRow extends ImportRow {
  index: number;
  valid: boolean;
  duplicate: boolean;
  reason?: string;
}

export interface ImportAnalysis {
  total: number;
  newCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: AnalyzedRow[];
}

const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "");

export class LeadImportService {
  // Validates each row and flags duplicates — both against existing org leads and earlier
  // rows in the same file. Pure read; used by both the simulate and commit paths.
  static async analyze(organizationId: string, rows: ImportRow[]): Promise<ImportAnalysis> {
    const existing = await db
      .select({ email: leads.email, phone: leads.phone })
      .from(leads)
      .where(and(eq(leads.organizationId, organizationId), isNull(leads.deletedAt)));

    const existingEmails = new Set(existing.map((e) => e.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existing.map((e) => digits(e.phone)).filter((d) => d.length >= 6));

    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();

    const analyzed: AnalyzedRow[] = rows.map((r, index) => {
      const name = (r.name ?? "").trim();
      const email = (r.email ?? "").trim().toLowerCase();
      const phone = digits(r.phone);

      let valid = true;
      let duplicate = false;
      let reason: string | undefined;

      if (!name) {
        valid = false;
        reason = "Missing required name";
      } else {
        const emailDup = !!email && (existingEmails.has(email) || seenEmail.has(email));
        const phoneDup = phone.length >= 6 && (existingPhones.has(phone) || seenPhone.has(phone));
        if (emailDup || phoneDup) {
          duplicate = true;
          reason = "Duplicate of an existing lead";
        }
      }

      if (email) seenEmail.add(email);
      if (phone.length >= 6) seenPhone.add(phone);

      return { ...r, index, valid, duplicate, reason };
    });

    return {
      total: analyzed.length,
      newCount: analyzed.filter((r) => r.valid && !r.duplicate).length,
      duplicateCount: analyzed.filter((r) => r.duplicate).length,
      errorCount: analyzed.filter((r) => !r.valid).length,
      rows: analyzed,
    };
  }

  // Inserts the valid, non-duplicate rows. Duplicates and invalid rows are skipped.
  static async commit(
    organizationId: string,
    userId: string | null,
    rows: ImportRow[],
    config: ImportConfig
  ): Promise<{ imported: number; skipped: number }> {
    const analysis = await this.analyze(organizationId, rows);
    const toInsert = analysis.rows.filter((r) => r.valid && !r.duplicate);

    if (toInsert.length > 0) {
      await db.insert(leads).values(
        toInsert.map((r) => ({
          organizationId,
          name: r.name!.trim(),
          email: r.email?.trim() || null,
          phone: r.phone?.trim() || null,
          company: r.company?.trim() || null,
          status: (r.status?.trim() || config.fallbackStatus || "new").toLowerCase(),
          sourceId: config.sourceId || null,
          ownerId: config.ownerId || userId || null,
          expectedValue: r.expectedValue?.trim() ? r.expectedValue.trim() : null,
        }))
      );
    }

    return { imported: toInsert.length, skipped: analysis.duplicateCount + analysis.errorCount };
  }
}
