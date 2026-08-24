"use server";

import { db } from "@/db";
import { automations, automationTriggers, automationConditions, automationActions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createAutomation(data: any) {
  // Simplified for MVP. Needs proper schema validation with Zod.
  const { name, isActive, trigger, conditions, actions } = data;

  const [newAutomation] = await db.insert(automations).values({
    name,
    isActive: isActive ?? true,
  }).returning();

  if (trigger) {
    await db.insert(automationTriggers).values({
      automationId: newAutomation.id,
      type: trigger.type,
      config: trigger.config || {},
    });
  }

  if (conditions) {
    await db.insert(automationConditions).values({
      automationId: newAutomation.id,
      config: conditions,
    });
  }

  if (actions && actions.length > 0) {
    for (let i = 0; i < actions.length; i++) {
      await db.insert(automationActions).values({
        automationId: newAutomation.id,
        type: actions[i].type,
        config: actions[i].config || {},
        orderIndex: i,
      });
    }
  }

  revalidatePath("/automations");
  return newAutomation;
}

export async function getAutomations() {
  const list = await db.select().from(automations);
  // Fetch triggers/actions for each...
  // For UI list view, we just need basic info.
  return list;
}

export async function getAutomation(id: string) {
  const [automation] = await db.select().from(automations).where(eq(automations.id, id));
  if (!automation) return null;

  const [trigger] = await db.select().from(automationTriggers).where(eq(automationTriggers.automationId, id));
  const [conditions] = await db.select().from(automationConditions).where(eq(automationConditions.automationId, id));
  const actions = await db.select().from(automationActions).where(eq(automationActions.automationId, id));

  return {
    ...automation,
    trigger,
    conditions: conditions?.config,
    actions,
  };
}

export async function toggleAutomation(id: string, isActive: boolean) {
  await db.update(automations).set({ isActive }).where(eq(automations.id, id));
  revalidatePath("/automations");
}

export async function deleteAutomation(id: string) {
  // Delete triggers, conditions, actions first
  await db.delete(automationTriggers).where(eq(automationTriggers.automationId, id));
  await db.delete(automationConditions).where(eq(automationConditions.automationId, id));
  await db.delete(automationActions).where(eq(automationActions.automationId, id));
  await db.delete(automations).where(eq(automations.id, id));
  
  revalidatePath("/automations");
}
