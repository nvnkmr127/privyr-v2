"use server";

import { requireOrg, requirePermission } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { LeadService } from "@/domains/leads/service";
import { OrgService } from "@/domains/organizations/service";
import { assertLeadInOrg } from "@/domains/leads/ownership";
import { CustomFieldService } from "@/domains/customFields/service";
import { AuditService } from "@/domains/audit/service";
import { PlanService } from "@/domains/billing/planService";

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  customData: z.record(z.string(), z.unknown()).optional(),
});

export async function createLeadAction(input: z.infer<typeof createLeadSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  // Pass empty strings as undefined
  const data = {
    name: parsed.data.name,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone || undefined,
    company: parsed.data.company || undefined,
  };

  // Enforce this org's required-field configuration (name is always required by schema).
  const org = await OrgService.getOrganization(organizationId);
  const required = (org?.requiredLeadFields ?? ["name"]) as Array<keyof typeof data>;
  const missing = required.filter((f) => !data[f]);
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }

  await PlanService.assertCanAddLead(organizationId);

  // Validate + clean org-defined custom fields.
  const customData = await CustomFieldService.validate(organizationId, parsed.data.customData ?? {});

  const lead = await LeadService.createLead({ ...data, customData }, userId, organizationId);

  revalidatePath('/leads');
  return lead;
}

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(255).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
});

export async function updateLeadAction(input: z.infer<typeof updateLeadSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const { id, ...data } = parsed.data;

  // Cleanup empty strings to undefined
  const cleanData = {
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    company: data.company || undefined,
  };

  const lead = await LeadService.updateLead(id, cleanData, userId, organizationId);

  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  return lead;
}

export async function updateCustomDataAction(leadId: string, data: Record<string, string>) {
  const { organizationId } = await requireOrg();
  const updated = await LeadService.updateCustomData(leadId, data, organizationId);
  revalidatePath(`/leads/${leadId}`);
  return updated;
}

export async function deleteLeadAction(id: string) {
  const { userId, organizationId } = await requirePermission("leads.delete");

  const deleted = await LeadService.deleteLead(id, userId, organizationId);

  if (deleted) {
    await AuditService.log({ organizationId, userId, action: "lead.delete", entityType: "lead", entityId: id });
    revalidatePath('/leads');
  }
  return deleted;
}

import { ActivityService } from "@/domains/activities/service";

export async function changeLeadStatusAction(id: string, status: string) {
  const { userId, organizationId } = await requireOrg();

  const lead = await LeadService.changeStatus(id, status, userId, organizationId);

  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  return lead;
}

const bulkChangeStatusSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  status: z.string(),
});

export async function bulkChangeLeadStatusAction(input: z.infer<typeof bulkChangeStatusSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = bulkChangeStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  // Basic sequential bulk operation. A real system might optimize this to a single query if event logs aren't strictly required.
  const results = [];
  for (const id of parsed.data.leadIds) {
    const lead = await LeadService.changeStatus(id, parsed.data.status, userId, organizationId);
    results.push(lead);
  }

  revalidatePath('/leads');
  return results;
}

const addNoteSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(1, "Note content cannot be empty"),
});

export async function addNoteAction(input: z.infer<typeof addNoteSchema>) {
  const { userId, organizationId } = await requireOrg();

  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  // The note attaches to a lead — make sure it's one this org owns.
  await assertLeadInOrg(parsed.data.leadId, organizationId);

  const activity = await ActivityService.addActivity({
    leadId: parsed.data.leadId,
    userId,
    type: 'note',
    content: parsed.data.content,
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return activity;
}

export const assignLeadAction = async (input: { leadId: string, ownerId: string | null, teamId: string | null }) => {
  const { userId, organizationId } = await requireOrg();
  
  if (!input.leadId) throw new Error("Lead ID is required");
  if (!input.ownerId && !input.teamId) throw new Error("Must provide ownerId or teamId");

  const { AssignmentService } = await import("@/domains/leads/assignmentService");
  
  const updatedLead = await AssignmentService.assignLead({
    leadId: input.leadId,
    ownerId: input.ownerId,
    teamId: input.teamId,
    assignedById: userId,
    organizationId,
  });

  revalidatePath(`/leads/${input.leadId}`);
  revalidatePath("/leads");
  
  return { success: true, lead: updatedLead };
};

export const bulkAssignLeadAction = async (input: { leadIds: string[], ownerId: string | null, teamId: string | null }) => {
  const { userId, organizationId } = await requireOrg();
  
  if (!input.leadIds || input.leadIds.length === 0) throw new Error("Lead IDs are required");
  if (!input.ownerId && !input.teamId) throw new Error("Must provide ownerId or teamId");

  const { AssignmentService } = await import("@/domains/leads/assignmentService");
  
  const updatedLeads = await AssignmentService.bulkAssignLeads({
    leadIds: input.leadIds,
    ownerId: input.ownerId,
    teamId: input.teamId,
    assignedById: userId,
    organizationId,
  });

  revalidatePath("/leads");
  
  return { success: true, count: updatedLeads.length };
};

export async function listStageLeadsAction(status: string, page: number = 1, limit: number = 20) {
  const { organizationId } = await requireOrg();
  return LeadService.listLeads({
    organizationId,
    status,
    page,
    limit,
  });
}

export async function recalculateLeadScoreAction(leadId: string) {
  await requireOrg();
  const { ScoringService } = await import("@/domains/leads/scoringService");
  const newScore = await ScoringService.updateLeadScore(leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { success: true, score: newScore };
}

export async function getNextBestActionAction(leadId: string) {
  const { organizationId } = await requireOrg();
  const { LeadService } = await import("@/domains/leads/service");
  const { NextBestActionService } = await import("@/domains/leads/nextBestActionService");
  const lead = await LeadService.getLead(leadId, organizationId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  return NextBestActionService.getRecommendation({
    status: lead.status,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    score: lead.score ?? 0,
    phone: lead.phone,
  });
}

export async function exportLeadAuditTrailAction(leadId: string) {
  const { organizationId } = await requireOrg();
  const { AuditExportService } = await import("@/domains/leads/auditExportService");
  return AuditExportService.getLeadAuditTrail(leadId, organizationId);
}

export async function getSlaMetricsAction(slaMinutesThreshold: number = 15) {
  const { organizationId } = await requireOrg();
  const { SlaAnalyticsService } = await import("@/domains/leads/slaAnalyticsService");
  return SlaAnalyticsService.getSlaMetrics(organizationId, slaMinutesThreshold);
}

export async function detectDuplicateLeadsAction() {
  const { organizationId } = await requireOrg();
  const { DuplicateResolutionService } = await import("@/domains/leads/duplicateResolutionService");
  return DuplicateResolutionService.detectDuplicates(organizationId);
}

export async function mergeDuplicateLeadsAction(primaryLeadId: string, secondaryLeadId: string) {
  const { userId, organizationId } = await requireOrg();
  const { DuplicateResolutionService } = await import("@/domains/leads/duplicateResolutionService");
  const result = await DuplicateResolutionService.mergeLeads(primaryLeadId, secondaryLeadId, organizationId, userId);
  revalidatePath("/leads");
  return result;
}

export async function getPipelineVelocityMetricsAction() {
  const { organizationId } = await requireOrg();
  const { PipelineVelocityService } = await import("@/domains/leads/pipelineVelocityService");
  return PipelineVelocityService.getVelocityMetrics(organizationId);
}

export async function getRepCapacitiesAction(maxCapacity: number = 25) {
  const { organizationId } = await requireOrg();
  const { CapacityAssignmentService } = await import("@/domains/leads/capacityAssignmentService");
  return CapacityAssignmentService.getRepCapacities(organizationId, maxCapacity);
}

export async function assignLeadWithCapacityAction(leadId: string, maxCapacity: number = 25) {
  const { userId, organizationId } = await requireOrg();
  const { CapacityAssignmentService } = await import("@/domains/leads/capacityAssignmentService");
  const result = await CapacityAssignmentService.assignLeadWithCapacity({
    leadId,
    organizationId,
    assignedById: userId,
    maxCapacity,
  });
  revalidatePath("/leads");
  return result;
}

export async function getLeadSourceRoiMetricsAction() {
  const { organizationId } = await requireOrg();
  const { SourceRoiAnalyticsService } = await import("@/domains/leads/sourceRoiAnalyticsService");
  return SourceRoiAnalyticsService.getLeadSourceRoiMetrics(organizationId);
}

export async function getStaleLeadsAction(daysInactiveThreshold: number = 14) {
  const { organizationId } = await requireOrg();
  const { StaleLeadReclamationService } = await import("@/domains/leads/staleLeadReclamationService");
  return StaleLeadReclamationService.detectStaleLeads(organizationId, daysInactiveThreshold);
}

export async function reclaimStaleLeadsAction(daysInactiveThreshold: number = 14) {
  const { userId, organizationId } = await requireOrg();
  const { StaleLeadReclamationService } = await import("@/domains/leads/staleLeadReclamationService");
  const result = await StaleLeadReclamationService.reclaimStaleLeads(organizationId, daysInactiveThreshold, userId);
  revalidatePath("/leads");
  return result;
}

export async function getTeamLeaderboardAction(periodDays?: number) {
  const { organizationId } = await requireOrg();
  const { TeamPerformanceService } = await import("@/domains/leads/teamPerformanceService");
  return TeamPerformanceService.getTeamLeaderboard(organizationId, periodDays);
}

export async function updateLeadCustomFieldsAction(leadId: string, customData: Record<string, any>) {
  const { userId, organizationId } = await requireOrg();
  const { CustomFieldsService } = await import("@/domains/leads/customFieldsService");
  const result = await CustomFieldsService.updateLeadCustomFields(leadId, organizationId, customData, userId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return result;
}

export async function getDailyActivityDigestAction(targetDateStr?: string) {
  const { organizationId } = await requireOrg();
  const { ActivityDigestService } = await import("@/domains/leads/activityDigestService");
  return ActivityDigestService.getDailyActivityDigest(organizationId, targetDateStr);
}

export async function getRevenueForecastAction() {
  const { organizationId } = await requireOrg();
  const { RevenueForecastService } = await import("@/domains/leads/revenueForecastService");
  return RevenueForecastService.getRevenueForecast(organizationId);
}

export async function getEngagementHealthBreakdownAction() {
  const { organizationId } = await requireOrg();
  const { EngagementHealthService } = await import("@/domains/leads/engagementHealthService");
  return EngagementHealthService.getEngagementHealthBreakdown(organizationId);
}

export async function getCohortAnalyticsAction() {
  const { organizationId } = await requireOrg();
  const { LeadCohortAnalyticsService } = await import("@/domains/leads/leadCohortAnalyticsService");
  return LeadCohortAnalyticsService.getCohortAnalytics(organizationId);
}

export async function getOverdueFollowUpsAction() {
  const { organizationId } = await requireOrg();
  const { FollowUpEscalationService } = await import("@/domains/leads/followUpEscalationService");
  return FollowUpEscalationService.getOverdueFollowUps(organizationId);
}

export async function escalateOverdueFollowUpsAction() {
  const { userId, organizationId } = await requireOrg();
  const { FollowUpEscalationService } = await import("@/domains/leads/followUpEscalationService");
  const result = await FollowUpEscalationService.escalateOverdueFollowUps(organizationId, userId);
  revalidatePath("/leads");
  return result;
}

export async function getWinLossAnalyticsAction() {
  const { organizationId } = await requireOrg();
  const { WinLossAnalyticsService } = await import("@/domains/leads/winLossAnalyticsService");
  return WinLossAnalyticsService.getWinLossAnalytics(organizationId);
}

export async function getEngagementVelocityAction() {
  const { organizationId } = await requireOrg();
  const { EngagementVelocityService } = await import("@/domains/leads/engagementVelocityService");
  return EngagementVelocityService.getEngagementVelocity(organizationId);
}

export async function getStagnantLeadsAction(daysThreshold: number = 10) {
  const { organizationId } = await requireOrg();
  const { StageStagnationService } = await import("@/domains/leads/stageStagnationService");
  return StageStagnationService.getStagnantLeads(organizationId, daysThreshold);
}

export async function flagStagnantLeadsAction(daysThreshold: number = 10) {
  const { userId, organizationId } = await requireOrg();
  const { StageStagnationService } = await import("@/domains/leads/stageStagnationService");
  const result = await StageStagnationService.flagStagnantLeads(organizationId, daysThreshold, userId);
  revalidatePath("/leads");
  return result;
}

export async function getChannelMetricsAction() {
  const { organizationId } = await requireOrg();
  const { ChannelAnalyticsService } = await import("@/domains/leads/channelAnalyticsService");
  return ChannelAnalyticsService.getChannelMetrics(organizationId);
}

export async function getPipelineScorecardAction() {
  const { organizationId } = await requireOrg();
  const { PipelineScorecardService } = await import("@/domains/leads/pipelineScorecardService");
  return PipelineScorecardService.getPipelineScorecard(organizationId);
}

export async function getGeoAnalyticsAction() {
  const { organizationId } = await requireOrg();
  const { LeadGeoAnalyticsService } = await import("@/domains/leads/leadGeoAnalyticsService");
  return LeadGeoAnalyticsService.getGeoAnalytics(organizationId);
}

export async function getSmartSegmentsAction() {
  const { organizationId } = await requireOrg();
  const { SmartSegmentationService } = await import("@/domains/leads/smartSegmentationService");
  return SmartSegmentationService.getSmartSegments(organizationId);
}

export async function getOptimalContactTimesAction() {
  const { organizationId } = await requireOrg();
  const { OptimalContactTimeService } = await import("@/domains/leads/optimalContactTimeService");
  return OptimalContactTimeService.getOptimalContactTimes(organizationId);
}

export async function getLtvAnalyticsAction() {
  const { organizationId } = await requireOrg();
  const { CustomerLtvAnalyticsService } = await import("@/domains/leads/customerLtvAnalyticsService");
  return CustomerLtvAnalyticsService.getLtvAnalytics(organizationId);
}

export async function getPipelineAgingMatrixAction() {
  const { organizationId } = await requireOrg();
  const { PipelineAgingService } = await import("@/domains/leads/pipelineAgingService");
  return PipelineAgingService.getPipelineAgingMatrix(organizationId);
}

export async function getLeadReengagementCadenceAction(leadId: string) {
  const { organizationId } = await requireOrg();
  const { ReengagementCadenceService } = await import("@/domains/leads/reengagementCadenceService");
  return ReengagementCadenceService.getLeadReengagementCadence(leadId, organizationId);
}

export async function triggerTestWebhookAction(
  endpointUrl: string,
  webhookSecret: string,
  event: "lead.created" | "lead.status_changed" | "lead.hot_threshold" | "lead.stagnant_alert",
  leadData: Record<string, any>
) {
  const { organizationId } = await requireOrg();
  const { LeadWebhookEventService } = await import("@/domains/leads/leadWebhookEventService");
  const payload = LeadWebhookEventService.constructPayload(organizationId, event, leadData);
  return LeadWebhookEventService.dispatchWebhook(endpointUrl, webhookSecret, payload);
}

export async function getDlqJobsAction() {
  const { organizationId } = await requireOrg();
  const { WebhookDlqService } = await import("@/domains/leads/webhookDlqService");
  return WebhookDlqService.getFailedDlqJobs(organizationId);
}

export async function retryDlqJobAction(jobId: string) {
  const { organizationId } = await requireOrg();
  const { WebhookDlqService } = await import("@/domains/leads/webhookDlqService");
  return WebhookDlqService.retryDlqJob(jobId, organizationId);
}

export async function purgeDlqJobAction(jobId: string) {
  const { organizationId } = await requireOrg();
  const { WebhookDlqService } = await import("@/domains/leads/webhookDlqService");
  return WebhookDlqService.purgeDlqJob(jobId, organizationId);
}

export async function mapFacebookLeadAction(facebookLeadData: any, customRules?: any[]) {
  await requireOrg();
  const { FacebookLeadMappingService } = await import("@/domains/leads/facebookLeadMappingService");
  return FacebookLeadMappingService.mapFacebookLeadToStandardLead(facebookLeadData, customRules);
}

export async function exchangeMetaTokenAction(shortLivedToken: string) {
  await requireOrg();
  const { MetaTokenRefreshService } = await import("@/domains/leads/metaTokenRefreshService");
  return MetaTokenRefreshService.exchangeShortLivedToken(shortLivedToken);
}

export async function mapUniversalLeadAction(provider: "facebook" | "google" | "linkedin" | "webhook" | "whatsapp", payload: any) {
  await requireOrg();
  const { UniversalLeadMappingService } = await import("@/domains/leads/universalLeadMappingService");
  return UniversalLeadMappingService.mapLeadByProvider(provider, payload);
}

export async function processIframeLeadAction(origin: string, payload: any) {
  await requireOrg();
  const { IframePostMessageWorker } = await import("@/domains/leads/iframePostMessageWorker");
  return IframePostMessageWorker.processIframePostMessage(origin, payload);
}


