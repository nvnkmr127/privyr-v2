import { eventBus, EventPayload } from "./emitter";
import { db } from "@/db";
import { automations, automationTriggers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { automationQueue } from "@/lib/jobs/workers/automationWorker";

async function dispatchTrigger(eventType: string, payload: EventPayload) {
  if (!payload.leadId) return;

  // Find active automations listening to this trigger type
  const activeTriggers = await db
    .select({
      automationId: automationTriggers.automationId,
    })
    .from(automationTriggers)
    .innerJoin(automations, eq(automationTriggers.automationId, automations.id))
    .where(
      and(
        eq(automations.isActive, true),
        eq(automationTriggers.type, eventType)
      )
    );

  for (const trigger of activeTriggers) {
    const idempotencyKey = `${trigger.automationId}-${payload.leadId}-${eventType}`;
    
    await automationQueue.add(`auto-${idempotencyKey}`, {
      automationId: trigger.automationId,
      leadId: payload.leadId,
      triggerType: eventType,
      idempotencyKey,
      payload,
    });
  }
}

import { ActivityService } from "@/domains/activities/service";

// Bind events to the dispatcher and activity logger
eventBus.on('lead.created', async (p) => {
  dispatchTrigger('lead.created', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.userId, type: 'note', content: 'Lead was created manually.' });
});

eventBus.on('lead.updated', async (p) => {
  dispatchTrigger('lead.updated', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.userId, type: 'note', content: 'Lead details were updated.' });
});

eventBus.on('lead.assigned', async (p) => {
  dispatchTrigger('lead.assigned', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.assignedById, type: 'note', content: `Lead was assigned to user ${p.ownerId}.` });
});

eventBus.on('lead.status_changed', async (p) => {
  dispatchTrigger('lead.status_changed', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.userId, type: 'note', content: `Status changed from ${p.oldStatus} to ${p.newStatus}.` });
});

eventBus.on('lead.stage_changed', (p) => dispatchTrigger('lead.stage_changed', p));
eventBus.on('lead.tag_added', (p) => dispatchTrigger('lead.tag_added', p));
eventBus.on('follow_up.overdue', (p) => dispatchTrigger('follow_up.overdue', p));

eventBus.on('follow_up.scheduled', async (p) => {
  dispatchTrigger('follow_up.scheduled', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.userId, type: 'note', content: `${p.type === 'task' ? 'Task' : 'Follow-up'} scheduled: ${p.title}` });
});

eventBus.on('follow_up.completed', async (p) => {
  dispatchTrigger('follow_up.completed', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.userId, type: 'note', content: `${p.type === 'task' ? 'Task' : 'Follow-up'} completed: ${p.title}` });
});

eventBus.on('follow_up.rescheduled', async (p) => {
  dispatchTrigger('follow_up.rescheduled', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.userId, type: 'note', content: `${p.type === 'task' ? 'Task' : 'Follow-up'} rescheduled: ${p.title}` });
});

eventBus.on('task.completed', async (p) => {
  dispatchTrigger('task.completed', p);
  await ActivityService.addActivity({ leadId: p.leadId, userId: p.userId, type: 'note', content: `Task completed: ${p.title}` });
});
