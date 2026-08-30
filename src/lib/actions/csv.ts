"use server";

import { z } from "zod";
import { requireOrg } from "@/lib/rbac";
import { ingestionQueue } from "@/lib/jobs/workers/ingestionWorker";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { parse } from "csv-parse/sync";
import { LeadSourceService } from "@/domains/leads/sourceService";

const uploadCsvSchema = z.object({
  sourceId: z.string(),
  csvContent: z.string(),
  teamId: z.string().optional(),
  ownerId: z.string().optional(),
});

export async function uploadCsvAction(input: z.infer<typeof uploadCsvSchema>) {
  const { organizationId } = await requireOrg();

  const parsed = uploadCsvSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input parameters.");
  }

  const { sourceId, csvContent, teamId, ownerId } = parsed.data;

  // Validate Source ownership
  const source = await LeadSourceService.getSource(sourceId);
  if (!source || source.organizationId !== organizationId) {
    throw new Error("Invalid or unauthorized lead source for CSV import.");
  }

  // 1. Parse CSV
  let records: Record<string, any>[];
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    throw new Error("Failed to parse CSV format. Please ensure valid comma-separated values.");
  }

  if (!records || records.length === 0) {
    throw new Error("No data records found in CSV file.");
  }

  if (records.length > 5000) {
    throw new Error("Maximum 5,000 rows allowed per import.");
  }

  // Verify headers contain at least a name column or identifiable contact fields
  const firstRow = records[0];
  const keys = Object.keys(firstRow).map((k) => k.toLowerCase().trim());
  const hasName = keys.some((k) => k.includes("name") || k.includes("contact") || k.includes("lead"));
  if (!hasName) {
    throw new Error("CSV must include a 'name' or 'lead name' column header.");
  }

  // 2. Queue each row as a webhook event payload in batch chunks
  const batchJobs: { id: string }[] = [];
  const CHUNK_SIZE = 250;

  await db.transaction(async (tx) => {
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const inserted = await tx.insert(webhookEvents).values(
        chunk.map((record) => ({
          provider: "generic_webhook",
          payload: {
            ...record,
            sourceId,
            organizationId,
            teamId,
            ownerId,
          },
        }))
      ).returning({ id: webhookEvents.id });

      batchJobs.push(...inserted);
    }
  });

  // 3. Offload to BullMQ using addBulk
  const queueJobs = batchJobs.map((job) => ({
    name: `ingest-${job.id}`,
    data: { webhookEventId: job.id },
  }));

  if (queueJobs.length > 0) {
    await ingestionQueue.addBulk(queueJobs);
  }

  return { success: true, count: batchJobs.length };
}
