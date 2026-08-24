import { db } from "@/db";
import { automationConditions, automationActions, leads } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { LeadService } from "@/domains/leads/service";
import { FollowUpService } from "@/domains/follow-ups/service";
import { ActivityService } from "@/domains/activities/service";
import { EventPayload } from "@/lib/events/emitter";

export class AutomationEngine {
  static async evaluateAndExecute(automationId: string, leadId: string, payload?: EventPayload) {
    // 1. Evaluate Conditions
    const conditionsData = await db
      .select()
      .from(automationConditions)
      .where(eq(automationConditions.automationId, automationId));

    if (conditionsData.length > 0) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) throw new Error(`Lead ${leadId} not found for condition evaluation`);

      const config = conditionsData[0].config as any;
      if (config && Object.keys(config).length > 0) {
        const passed = this.evaluateConditionGroup(lead, config);
        if (!passed) {
          return { skipped: true, executedCount: 0 };
        }
      }
    }

    // 2. Execute Actions Sequentially
    const actions = await db
      .select()
      .from(automationActions)
      .where(eq(automationActions.automationId, automationId))
      .orderBy(asc(automationActions.orderIndex));

    let executedCount = 0;
    for (const action of actions) {
      try {
        await this.executeAction(leadId, action.type, action.config as any, payload);
        executedCount++;
      } catch (error) {
        throw new Error(`Action ${action.type} failed: ${(error as Error).message}`);
      }
    }

    return { skipped: false, executedCount };
  }

  private static evaluateConditionGroup(lead: any, group: any): boolean {
    if (!group) return true;

    if (group.type === 'AND' || group.type === 'OR') {
      const conditions = group.conditions || [];
      if (conditions.length === 0) return true;

      if (group.type === 'AND') {
        return conditions.every((cond: any) => this.evaluateConditionGroup(lead, cond));
      } else {
        return conditions.some((cond: any) => this.evaluateConditionGroup(lead, cond));
      }
    } else if (group.field && group.operator) {
      // Base condition
      return this.evaluateCondition(lead, group);
    }
    
    return true; // Fallback
  }

  private static evaluateCondition(lead: any, condition: any): boolean {
    const { field, operator, value } = condition;
    const leadValue = lead[field];

    // Handle null/undefined appropriately
    const normalize = (val: any) => val === null || val === undefined ? '' : String(val).toLowerCase();

    switch (operator) {
      case 'equals':
        return leadValue === value;
      case 'not_equals':
        return leadValue !== value;
      case 'contains':
        return normalize(leadValue).includes(normalize(value));
      case 'does_not_contain':
        return !normalize(leadValue).includes(normalize(value));
      case 'greater_than':
        return Number(leadValue) > Number(value);
      case 'less_than':
        return Number(leadValue) < Number(value);
      default:
        console.warn(`Unsupported operator: ${operator}`);
        return false;
    }
  }

  private static async executeAction(leadId: string, type: string, config: any, payload?: EventPayload) {
    const defaultUserId = payload?.userId || payload?.ownerId; // Fallback actor

    switch (type) {
      case 'assign_lead':
        if (!config.userId) throw new Error("Missing userId for assign_lead");
        await LeadService.assignLead(leadId, config.userId, defaultUserId);
        break;
      
      case 'change_status':
        if (!config.status) throw new Error("Missing status for change_status");
        if (!defaultUserId) throw new Error("Missing actor userId for change_status");
        await LeadService.changeStatus(leadId, config.status, defaultUserId);
        break;

      case 'create_task':
      case 'schedule_follow_up':
        if (!config.title || !config.dueAt) throw new Error(`Missing required fields for ${type}`);
        await FollowUpService.createFollowUp({
          leadId,
          type: type === 'create_task' ? 'task' : 'follow_up',
          title: config.title,
          description: config.description,
          dueAt: new Date(config.dueAt),
          userId: config.userId || defaultUserId || "", // Requires a user
        });
        break;

      case 'add_note':
        if (!config.content) throw new Error("Missing content for add_note");
        await ActivityService.addActivity({
          leadId,
          userId: defaultUserId,
          type: 'note',
          content: config.content,
        });
        break;

      default:
        throw new Error(`Unsupported action type: ${type}`);
    }
  }
}
