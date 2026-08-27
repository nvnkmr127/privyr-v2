import { db } from "@/db";
import { leads, assignmentRules } from "@/db/schema/leads";
import { users } from "@/db/schema/users";
import { eq, and, desc } from "drizzle-orm";
import { eventBus } from "@/lib/events/emitter";

// Pure round-robin step: index of the user to assign next given the last one.
// Wraps around, and starts from 0 when there's no last user or it's no longer on the team.
export function nextRoundRobinIndex(userIds: string[], lastAssignedUserId: string | null): number {
  if (userIds.length === 0) return -1;
  if (!lastAssignedUserId) return 0;
  const i = userIds.indexOf(lastAssignedUserId);
  return i === -1 ? 0 : (i + 1) % userIds.length;
}

export class AssignmentService {
  /**
   * Executes automatic assignment for a lead based on its source.
   * If a rule exists, evaluates it (direct or round-robin).
   */
  static async executeAutomaticAssignment(leadId: string, sourceId: string | null) {
    if (!sourceId) return;

    // Resolve the target inside a transaction that LOCKS the rule row (FOR UPDATE), so two
    // leads ingested in parallel can't read the same lastAssignedUserId and land on the same
    // rep. Concurrent workers serialize on this row and the rotation advances correctly.
    const target = await db.transaction(async (tx) => {
      const [rule] = await tx
        .select()
        .from(assignmentRules)
        .where(eq(assignmentRules.sourceId, sourceId))
        .orderBy(desc(assignmentRules.priority))
        .limit(1)
        .for("update");

      if (!rule) return null;

      // Direct assignment: fixed user and/or team on the rule.
      if (rule.type !== "source_round_robin" || !rule.teamId) {
        return { userId: rule.userId, teamId: rule.teamId };
      }

      // Round-robin across active team members, ordered for deterministic rotation.
      const teamUsers = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.teamId, rule.teamId), eq(users.isActive, true)))
        .orderBy(users.id);

      const idx = nextRoundRobinIndex(teamUsers.map((u) => u.id), rule.lastAssignedUserId);
      if (idx === -1) return { userId: null, teamId: rule.teamId };

      const chosen = teamUsers[idx].id;
      await tx.update(assignmentRules)
        .set({ lastAssignedUserId: chosen })
        .where(eq(assignmentRules.id, rule.id));

      return { userId: chosen, teamId: rule.teamId };
    });

    if (target && (target.userId || target.teamId)) {
      await this.assignLead(leadId, target.userId, target.teamId, "system");
    }
  }

  /**
   * Manually assign or reassign a lead to a user/team.
   */
  static async assignLead(leadId: string, ownerId: string | null, teamId: string | null, assignedById: string) {
    const [updatedLead] = await db.update(leads)
      .set({ ownerId, teamId, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();

    if (updatedLead) {
      eventBus.emit('lead.assigned', { 
        leadId, 
        ownerId: ownerId || undefined,
        teamId,
        assignedById 
      });
    }

    return updatedLead;
  }

  /**
   * Bulk assign multiple leads.
   */
  static async bulkAssignLeads(leadIds: string[], ownerId: string | null, teamId: string | null, assignedById: string) {
    const batchUpdates: any[] = [];
    
    await db.transaction(async (tx) => {
      for (const leadId of leadIds) {
        const [updatedLead] = await tx.update(leads)
          .set({ ownerId, teamId, updatedAt: new Date() })
          .where(eq(leads.id, leadId))
          .returning();
          
        if (updatedLead) {
          batchUpdates.push(updatedLead);
        }
      }
    });

    for (const lead of batchUpdates) {
      eventBus.emit('lead.assigned', { 
        leadId: lead.id, 
        ownerId: ownerId || undefined,
        teamId,
        assignedById 
      });
    }

    return batchUpdates;
  }
}
