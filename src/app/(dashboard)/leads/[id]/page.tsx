import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Phone, Mail, Building, Sparkles } from "lucide-react";
import Link from "next/link";
import { LeadService } from "@/domains/leads/service";
import { NextBestActionService } from "@/domains/leads/nextBestActionService";
import { ShareContentCard } from "@/components/leads/ShareContentCard";
import { ReengagementPlanCard } from "@/components/leads/ReengagementPlanCard";
import { listSharesAction } from "@/lib/actions/sharedContent";
import { requireOrg } from "@/lib/rbac";
import { ActivityService } from "@/domains/activities/service";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AddNoteForm } from "@/components/leads/AddNoteForm";
import { WhatsAppSendBox } from "@/components/leads/WhatsAppSendBox";
import { EmailSendBox } from "@/components/leads/EmailSendBox";
import { WhatsAppThread } from "@/components/leads/WhatsAppThread";
import { WhatsAppService } from "@/lib/messaging/whatsapp/service";
import { LeadStatusControl } from "@/components/leads/LeadStatusControl";
import { LeadAssignControl } from "@/components/leads/LeadAssignControl";
import { LeadTags } from "@/components/leads/LeadTags";
import { LeadCustomFields } from "@/components/leads/LeadCustomFields";
import { TagService } from "@/domains/tags/service";
import { LeadDuplicateBanner } from "@/components/leads/LeadDuplicateBanner";
import { LeadFollowUpControl } from "@/components/leads/LeadFollowUpControl";
import { LeadStageAndValueControl } from "@/components/leads/LeadStageAndValueControl";
import { LeadSequencesCard } from "@/components/leads/LeadSequencesCard";
import { checkLeadDuplicatesAction } from "@/lib/actions/leads";
import { getAttachmentsAction } from "@/lib/actions/attachments";
import { getLeadRemindersAction } from "@/lib/actions/reminders";
import { getOrganizationAction } from "@/lib/actions/organizations";
import { LeadAiRecap } from "@/components/leads/LeadAiRecap";
import { LeadInsightsCard } from "@/components/leads/LeadInsightsCard";
import { listSequencesAction } from "@/lib/actions/sequences";
import { SequenceService } from "@/domains/leads/sequenceService";
import { LeadHeaderQuickActions } from "@/components/leads/LeadHeaderQuickActions";
import { LeadRemindersTab } from "@/components/leads/LeadRemindersTab";
import { LeadAttachmentsTab } from "@/components/leads/LeadAttachmentsTab";
import { db } from "@/db";
import { leadPipelineStages, automations } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    notFound();
  }

  const { organizationId } = await requireOrg();

  // These reads are independent — fan them out in one round trip instead of a serial waterfall
  // (11 sequential DB calls × cross-region RTT was several seconds of avoidable latency).
  const [
    lead,
    activities,
    waMessages,
    leadTags,
    dup,
    attachments,
    reminders,
    shares,
    org,
    availableSequences,
    enrolledSequences,
    stagesList,
    automationsList,
  ] = await Promise.all([
    LeadService.getLead(id, organizationId),
    ActivityService.getLeadActivities(id),
    WhatsAppService.listForLead(id),
    TagService.getForLead(id),
    checkLeadDuplicatesAction(id),
    getAttachmentsAction(id).catch(() => []),
    getLeadRemindersAction(id).catch(() => []),
    listSharesAction(id).catch(() => []),
    getOrganizationAction().catch(() => null),
    listSequencesAction().catch(() => []),
    SequenceService.listForLead(id).catch(() => []),
    db.select({ id: leadPipelineStages.id, name: leadPipelineStages.name }).from(leadPipelineStages).catch(() => []),
    db
      .select({ id: automations.id, name: automations.name })
      .from(automations)
      .where(eq(automations.organizationId, organizationId))
      .catch(() => []),
  ]);
  const dupCount = dup.count;
  const whatsappMode: "personal" | "bsp" = org?.whatsappMode === "bsp" ? "bsp" : "personal";

  if (!lead) {
    notFound();
  }

  // A content open in the last 3 days is a hot buying signal — surface it to the coach.
  const RECENT_OPEN_MS = 3 * 24 * 60 * 60 * 1000;
  const recentOpen = shares
    .filter((s) => s.viewCount > 0 && s.lastViewedAt && Date.now() - new Date(s.lastViewedAt).getTime() <= RECENT_OPEN_MS)
    .sort((a, b) => new Date(b.lastViewedAt!).getTime() - new Date(a.lastViewedAt!).getTime())[0];

  const nba = NextBestActionService.getRecommendation({
    status: lead.status,
    score: lead.score ?? 0,
    phone: lead.phone,
    email: lead.email,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    recentContentOpen: recentOpen ? { title: recentOpen.title, count: recentOpen.viewCount } : null,
  });
  const nbaAccent =
    nba.priority === "high"
      ? "border-red-500/40 bg-red-500/5"
      : nba.priority === "medium"
        ? "border-orange-500/40 bg-orange-500/5"
        : "border-border bg-card";

  const notesCount = activities.filter((a) => a.type === "note").length;
  const initials =
    lead.name
      ?.split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Duplicate Warning Banner */}
      <LeadDuplicateBanner count={dupCount} searchQuery={lead.email || lead.phone || undefined} />

      {(lead.status === "lost" || lead.status === "unqualified") && lead.lostReason && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm">
          <span className="font-medium capitalize">{lead.status}</span>
          <span className="text-muted-foreground"> — reason: {lead.lostReason}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold text-secondary-foreground">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{lead.name}</h2>
              <Badge variant={lead.status === "new" ? "default" : "secondary"} className="capitalize">
                {lead.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created{" "}
              {lead.createdAt
                ? new Date(lead.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                : "recently"}
            </p>
          </div>
        </div>

        {/* Quick Actions Header Toolbar */}
        <LeadHeaderQuickActions lead={lead} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lead Info & Attributes */}
        <div className="lg:col-span-1 space-y-6">
          {/* Next Best Action — the coach prompt */}
          <div className={`rounded-2xl border p-5 space-y-2 ${nbaAccent}`}>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Next Best Action
            </h3>
            <p className="text-base font-semibold leading-snug">{nba.label}</p>
            <p className="text-sm text-muted-foreground">{nba.reason}</p>
            <LeadAiRecap leadId={lead.id} />
          </div>

          {/* Why this score + enrichment evidence — only renders when there's something to show */}
          <LeadInsightsCard score={lead.score} customData={lead.customData} />

          {/* Follow Up Reminder Widget */}
          <LeadFollowUpControl leadId={lead.id} nextFollowUpAt={lead.nextFollowUpAt} />

          {/* Share & track content — read receipts on what you send */}
          <ShareContentCard leadId={lead.id} leadPhone={lead.phone} initialShares={shares} />

          {/* Re-engagement cadence — only shows for cold leads */}
          <ReengagementPlanCard leadId={lead.id} organizationId={organizationId} />

          {/* Quick Controls Card */}
          <div className="rounded-2xl border border-border p-5 bg-card space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Lead Management
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground block mb-1.5">Status</span>
                <LeadStatusControl leadId={lead.id} status={lead.status} />
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1.5">Assignee</span>
                <LeadAssignControl leadId={lead.id} ownerId={lead.ownerId} />
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1.5">Tags</span>
                <LeadTags leadId={lead.id} initialTags={leadTags} />
              </div>

              {/* Stage & Opportunity Value */}
              <div className="border-t pt-4">
                <LeadStageAndValueControl
                  leadId={lead.id}
                  stageId={lead.stageId}
                  expectedValue={lead.expectedValue}
                  stages={stagesList}
                />
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="rounded-2xl border border-border p-5 bg-card space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Contact Info
            </h3>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block">Email</span>
                  <p className="font-medium truncate">{lead.email || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block">Phone</span>
                  <p className="font-medium truncate">{lead.phone || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block">Company</span>
                  <p className="font-medium truncate">{lead.company || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Fields Card */}
          <div className="rounded-2xl border border-border p-5 bg-card space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Custom Attributes
            </h3>
            <LeadCustomFields leadId={lead.id} initialData={(lead.customData as Record<string, unknown>) ?? {}} />
          </div>
        </div>

        {/* Right Column: Sequences & Activity/Messaging Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Automated Sequences Card */}
          <LeadSequencesCard leadId={lead.id} availableSequences={availableSequences} initialEnrolled={enrolledSequences} />

          {/* Tabs Container */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <Tabs defaultValue="activity" className="w-full">
              <div className="border-b border-border px-4 overflow-x-auto">
                <TabsList className="h-auto bg-transparent gap-1 p-0 justify-start">
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent -mb-px px-4 py-3 text-sm font-medium text-muted-foreground shrink-0 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Activity Log ({activities.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="reminders"
                    className="rounded-none border-b-2 border-transparent -mb-px px-4 py-3 text-sm font-medium text-muted-foreground shrink-0 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Reminders ({reminders.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="attachments"
                    className="rounded-none border-b-2 border-transparent -mb-px px-4 py-3 text-sm font-medium text-muted-foreground shrink-0 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Attachments ({attachments.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="whatsapp"
                    className="rounded-none border-b-2 border-transparent -mb-px px-4 py-3 text-sm font-medium text-muted-foreground shrink-0 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    WhatsApp ({waMessages.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="rounded-none border-b-2 border-transparent -mb-px px-4 py-3 text-sm font-medium text-muted-foreground shrink-0 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Notes ({notesCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="emails"
                    className="rounded-none border-b-2 border-transparent -mb-px px-4 py-3 text-sm font-medium text-muted-foreground shrink-0 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Send Email
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="activity" className="mt-0 space-y-4">
                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No activity recorded for this lead yet.
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l border-border/60 space-y-6">
                      {activities.map((activity) => (
                        <div key={activity.id} className="relative group">
                          <div className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {activity.type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {activity.createdAt.toLocaleDateString(undefined, { dateStyle: "short" })}{" "}
                              {activity.createdAt.toLocaleTimeString(undefined, { timeStyle: "short" })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground mt-1 whitespace-pre-wrap">
                            {activity.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reminders" className="mt-0">
                  <LeadRemindersTab leadId={lead.id} initialReminders={reminders} />
                </TabsContent>

                <TabsContent value="attachments" className="mt-0">
                  <LeadAttachmentsTab leadId={lead.id} initialAttachments={attachments} />
                </TabsContent>

                <TabsContent value="whatsapp" className="mt-0 space-y-4">
                  <WhatsAppThread messages={waMessages} />
                  <WhatsAppSendBox leadId={lead.id} hasPhone={!!lead.phone} mode={whatsappMode} phone={lead.phone} />
                </TabsContent>

                <TabsContent value="emails" className="mt-0 space-y-4">
                  <EmailSendBox leadId={lead.id} email={lead.email} />
                </TabsContent>

                <TabsContent value="notes" className="mt-0 space-y-6">
                  <AddNoteForm leadId={lead.id} />
                  <div className="space-y-3">
                    {notesCount === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No notes added yet. Use the form above to add a note.
                      </div>
                    ) : (
                      activities
                        .filter((a) => a.type === "note")
                        .map((note) => (
                          <div key={note.id} className="bg-muted/40 p-4 rounded-lg border text-sm space-y-2">
                            <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                            <div className="text-xs text-muted-foreground text-right">
                              {note.createdAt.toLocaleDateString(undefined, { dateStyle: "short" })}{" "}
                              {note.createdAt.toLocaleTimeString(undefined, { timeStyle: "short" })}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}



