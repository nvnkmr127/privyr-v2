import { db } from "@/db";
import { leads, assignmentRules } from "@/db/schema/leads";
import { users } from "@/db/schema/users";
import { eq, and, desc } from "drizzle-orm";
import { eventBus } from "@/lib/events/emitter";

export class AssignmentService {
  /**
   * Executes automatic assignment for a lead based on its source.
   * If a rule exists, evaluates it (direct or round-robin).
   */
  static async executeAutomaticAssignment(leadId: string, sourceId: string | null) {
    if (!sourceId) return;

    // 1. Find matching rule
    const [rule] = await db
      .select()
      .from(assignmentRules)
      .where(eq(assignmentRules.sourceId, sourceId))
      .orderBy(desc(assignmentRules.priority))
      .limit(1);

    if (!rule) return;

    let targetUserId = rule.userId;
    let targetTeamId = rule.teamId;

    // 2. Handle Round Robin if team is selected but no specific user
    if (rule.type === 'source_round_robin' && rule.teamId) {
      // Find all active users in the team
      const teamUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.teamId, rule.teamId), eq(users.isActive, true)));

      if (teamUsers.length > 0) {
        // Find next user
        let nextIndex = 0;
        if (rule.lastAssignedUserId) {
          const lastIndex = teamUsers.findIndex((u) => u.id === rule.lastAssignedUserId);
          if (lastIndex !== -1 && lastIndex < teamUsers.length - 1) {
            nextIndex = lastIndex + 1;
          }
        }
        
        targetUserId = teamUsers[nextIndex].id;

        // Update the rule state (this should ideally be inside a transaction with row locking)
        await db.update(assignmentRules)
          .set({ lastAssignedUserId: targetUserId })
          .where(eq(assignmentRules.id, rule.id));
      }
    }

    if (targetUserId || targetTeamId) {
      await this.assignLead(leadId, targetUserId, targetTeamId, 'system');
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
