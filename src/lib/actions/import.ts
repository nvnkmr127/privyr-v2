"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { parse } from "csv-parse/sync";
import { requireOrg } from "@/lib/rbac";
import { LeadImportService, type ImportRow, IMPORT_FIELDS } from "@/domains/leads/importService";

// Parses raw CSV into headers + row objects (keyed by header). csv-parse handles quoting/escaping
// robustly — better than a hand-rolled client parser. Auto-suggests a field→header mapping.
export async function parseImportCsvAction(csvContent: string) {
  await requireOrg();
  const records: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  const headers = records.length ? Object.keys(records[0]) : [];

  // Suggest a mapping: match each import field to a header by loose name equality.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const mapping: Record<string, string> = {};
  for (const f of IMPORT_FIELDS) {
    const hit = headers.find((h) => norm(h) === norm(f.key) || norm(h) === norm(f.label));
    if (hit) mapping[f.key] = hit;
  }

  return { headers, rows: records.slice(0, 5000), mapping };
}

const rowSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.string().optional(),
  expectedValue: z.string().optional(),
});

const configSchema = z.object({
  sourceId: z.string().nullish(),
  ownerId: z.string().nullish(),
  fallbackStatus: z.string().optional(),
});

// Simulate (dry run): validate + detect duplicates, return what WOULD happen. No writes.
export async function simulateImportAction(input: { rows: ImportRow[] }) {
  const { organizationId } = await requireOrg();
  const rows = z.array(rowSchema).max(5000).parse(input.rows);
  return LeadImportService.analyze(organizationId, rows);
}

// Commit: insert the valid, non-duplicate rows.
export async function commitImportAction(input: { rows: ImportRow[]; config: z.infer<typeof configSchema> }) {
  const { organizationId, userId } = await requireOrg();
  const rows = z.array(rowSchema).max(5000).parse(input.rows);
  const config = configSchema.parse(input.config);
  const res = await LeadImportService.commit(organizationId, userId, rows, config);
  revalidatePath("/leads");
  return res;
}
