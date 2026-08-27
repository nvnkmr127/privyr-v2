"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/rbac";
import { ingestionQueue } from "@/lib/jobs/workers/ingestionWorker";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { parse } from "csv-parse/sync";

const uploadCsvSchema = z.object({
  sourceId: z.string(),
  csvContent: z.string(),
  teamId: z.string().optional(),
  ownerId: z.string().optional(),
});

export async function uploadCsvAction(input: z.infer<typeof uploadCsvSchema>) {
  const session = await requireAuth();

  const parsed = uploadCsvSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const { sourceId, csvContent, teamId, ownerId } = parsed.data;

  // 1. Parse CSV
  let records: any[];
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });
  } catch (error) {
    throw new Error("Failed to parse CSV format.");
  }

  if (records.length === 0) {
    throw new Error("No records found in CSV.");
  }

  if (records.length > 5000) {
    throw new Error("Max 5000 rows allowed per import.");
  }

  // 2. Queue each row as a webhook event payload
  const batchJobs: any[] = [];
  
  // We can insert events in batches to improve db performance, but for simplicity here we do a transaction
  await db.transaction(async (tx) => {
    for (const record of records) {
      const payload = {
        ...record,
        sourceId,
        teamId,
        ownerId,
      };

      const [event] = await tx.insert(webhookEvents).values({
        provider: "generic_webhook", // reuse generic webhook mapping logic
        payload,
      }).returning();
      
      batchJobs.push(event);
    }
  });

  // 3. Offload to BullMQ
  for (const job of batchJobs) {
    await ingestionQueue.add(`ingest-${job.id}`, {
      webhookEventId: job.id
    });
  }

  return { success: true, count: batchJobs.length };
}
