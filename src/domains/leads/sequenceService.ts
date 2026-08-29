import { db } from "@/db";
import { sequences, sequenceSteps, sequenceEnrollments, leads } from "@/db/schema";
import { and, eq, lte, asc, sql } from "drizzle-orm";
import { ActivityService } from "@/domains/activities/service";

export interface SequenceStepInput {
  dayOffset: number;
  channel: "whatsapp" | "email";
  body: string;
}

const DAY = 24 * 60 * 60 * 1000;

function renderTokens(body: string, lead: { name: string | null }): string {
  const first = (lead.name ?? "there").split(" ")[0];
  return body.replace(/\{\{\s*first_name\s*\}\}/gi, first).replace(/\{\{\s*name\s*\}\}/gi, lead.name ?? "there");
}

export class SequenceService {
  static async create(organizationId: string, name: string, steps: SequenceStepInput[]) {
    const [seq] = await db.insert(sequences).values({ organizationId, name }).returning();
    if (steps.length) {
      await db.insert(sequenceSteps).values(
        steps.map((s, i) => ({
          sequenceId: seq.id,
          stepIndex: i,
          dayOffset: Math.max(0, Math.floor(s.dayOffset)),
          channel: s.channel === "email" ? "email" : "whatsapp",
          body: s.body,
        }))
      );
    }
    return seq;
  }

  static async list(organizationId: string) {
    const rows = await db.select().from(sequences).where(eq(sequences.organizationId, organizationId)).orderBy(asc(sequences.createdAt));
    return Promise.all(
      rows.map(async (s) => {
        const [{ steps }] = await db.select({ steps: sql<number>`count(*)::int` }).from(sequenceSteps).where(eq(sequenceSteps.sequenceId, s.id));
        const [{ active }] = await db
          .select({ active: sql<number>`count(*)::int` })
          .from(sequenceEnrollments)
          .where(and(eq(sequenceEnrollments.sequenceId, s.id), eq(sequenceEnrollments.status, "active")));
        return { ...s, stepCount: steps, activeEnrollments: active };
      })
    );
  }

  static async listForLead(leadId: string) {
    return db
      .select({
        enrollmentId: sequenceEnrollments.id,
        sequenceId: sequences.id,
        name: sequences.name,
        status: sequenceEnrollments.status,
        currentStep: sequenceEnrollments.currentStep,
        nextRunAt: sequenceEnrollments.nextRunAt,
      })
      .from(sequenceEnrollments)
      .innerJoin(sequences, eq(sequenceEnrollments.sequenceId, sequences.id))
      .where(eq(sequenceEnrollments.leadId, leadId));
  }

  // Enroll leads at step 0; the first step fires on the next scan (dayOffset 0) or later.
  static async enroll(organizationId: string, sequenceId: string, leadIds: string[]) {
    const [seq] = await db.select().from(sequences).where(and(eq(sequences.id, sequenceId), eq(sequences.organizationId, organizationId)));
    if (!seq) throw new Error("Sequence not found");
    const steps = await db.select().from(sequenceSteps).where(eq(sequenceSteps.sequenceId, sequenceId)).orderBy(asc(sequenceSteps.stepIndex));
    if (steps.length === 0) throw new Error("Sequence has no steps");

    let enrolled = 0;
    for (const leadId of leadIds) {
      const [existing] = await db
        .select({ id: sequenceEnrollments.id })
        .from(sequenceEnrollments)
        .where(and(eq(sequenceEnrollments.sequenceId, sequenceId), eq(sequenceEnrollments.leadId, leadId), eq(sequenceEnrollments.status, "active")));
      if (existing) continue;
      const nextRunAt = new Date(Date.now() + steps[0].dayOffset * DAY);
      await db.insert(sequenceEnrollments).values({ sequenceId, leadId, organizationId, currentStep: 0, status: "active", nextRunAt });
      enrolled++;
    }
    return { enrolled };
  }

  static async stop(organizationId: string, enrollmentId: string) {
    await db
      .update(sequenceEnrollments)
      .set({ status: "stopped", nextRunAt: null })
      .where(and(eq(sequenceEnrollments.id, enrollmentId), eq(sequenceEnrollments.organizationId, organizationId)));
    return { ok: true };
  }

  // Scan worker entry point: deliver every due step, then advance or complete the enrolment.
  static async runDue(limit = 200): Promise<{ processed: number }> {
    const due = await db
      .select()
      .from(sequenceEnrollments)
      .where(and(eq(sequenceEnrollments.status, "active"), lte(sequenceEnrollments.nextRunAt, new Date())))
      .limit(limit);

    let processed = 0;
    for (const enr of due) {
      const steps = await db.select().from(sequenceSteps).where(eq(sequenceSteps.sequenceId, enr.sequenceId)).orderBy(asc(sequenceSteps.stepIndex));
      const step = steps[enr.currentStep];
      if (!step) {
        await db.update(sequenceEnrollments).set({ status: "completed", nextRunAt: null }).where(eq(sequenceEnrollments.id, enr.id));
        continue;
      }
      await this.deliver(enr.leadId, step.channel, step.body);
      processed++;

      const nextIndex = enr.currentStep + 1;
      if (steps[nextIndex]) {
        const nextRunAt = new Date(new Date(enr.createdAt).getTime() + steps[nextIndex].dayOffset * DAY);
        await db.update(sequenceEnrollments).set({ currentStep: nextIndex, nextRunAt }).where(eq(sequenceEnrollments.id, enr.id));
      } else {
        await db.update(sequenceEnrollments).set({ status: "completed", nextRunAt: null }).where(eq(sequenceEnrollments.id, enr.id));
      }
    }
    return { processed };
  }

  // Best-effort send. A failure (no BSP window, no email) must not stall the drip — we log a
  // manual-send nudge on the timeline and let the enrolment advance on schedule.
  private static async deliver(leadId: string, channel: string, body: string) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) return;
    const rendered = renderTokens(body, lead);
    try {
      if (channel === "email") {
        if (!lead.email) throw new Error("no email");
        const { sendEmail } = await import("@/lib/mail/mailer");
        await sendEmail({ to: lead.email, subject: "Following up", html: `<p>${rendered.replace(/\n/g, "<br/>")}</p>` });
        await ActivityService.addActivity({ leadId, type: "email", content: `[sequence email] ${rendered.slice(0, 120)}` });
      } else {
        const { WhatsAppService } = await import("@/lib/messaging/whatsapp/service");
        await WhatsAppService.send({ leadId, body: rendered });
        await ActivityService.addActivity({ leadId, type: "whatsapp", content: `[sequence whatsapp] ${rendered.slice(0, 120)}` });
      }
    } catch {
      await ActivityService.addActivity({
        leadId,
        type: "note",
        content: `Sequence step due (${channel}) — send manually: ${rendered.slice(0, 160)}`,
      });
    }
  }
}
