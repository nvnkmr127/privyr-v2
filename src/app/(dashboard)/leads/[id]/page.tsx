import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Phone, Mail, Building } from "lucide-react";
import Link from "next/link";
import { LeadService } from "@/domains/leads/service";
import { requireOrg } from "@/lib/rbac";
import { ActivityService } from "@/domains/activities/service";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EditLeadDialog } from "@/components/leads/EditLeadDialog";
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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireOrg();
  const lead = await LeadService.getLead(id, organizationId);
  const activities = await ActivityService.getLeadActivities(id);
  const waMessages = await WhatsAppService.listForLead(id);
  const leadTags = await TagService.getForLead(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Lead Details</h2>
        <Badge variant={lead.status === 'new' ? 'default' : 'secondary'} className="ml-4">
          {lead.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Lead Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="border rounded-xl p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" /> Contact Info
              </h3>
              <EditLeadDialog lead={lead} />
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-500 block mb-1">Status</span>
                <LeadStatusControl leadId={lead.id} status={lead.status} />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Owner</span>
                <LeadAssignControl leadId={lead.id} ownerId={lead.ownerId} />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Tags</span>
                <LeadTags leadId={lead.id} initialTags={leadTags} />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Name</span>
                <p className="font-medium text-base">{lead.name}</p>
              </div>
              
              {lead.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <span className="text-slate-500 block">Email</span>
                    <p className="font-medium">{lead.email}</p>
                  </div>
                </div>
              )}
              
              {lead.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <span className="text-slate-500 block">Phone</span>
                    <p className="font-medium">{lead.phone}</p>
                  </div>
                </div>
              )}

              {lead.company && (
                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 text-slate-400 mt-1" />
                  <div>
                    <span className="text-slate-500 block">Company</span>
                    <p className="font-medium">{lead.company}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Details</h3>
            <LeadCustomFields leadId={lead.id} initialData={(lead.customData as Record<string, unknown>) ?? {}} />
          </div>
        </div>

        {/* Right Column: Activity & Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
              <TabsTrigger value="activity" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none">Activity</TabsTrigger>
              <TabsTrigger value="whatsapp" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none">WhatsApp</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none">Notes</TabsTrigger>
              <TabsTrigger value="emails" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none">Emails</TabsTrigger>
            </TabsList>
            <TabsContent value="whatsapp" className="p-4 pt-6 space-y-4">
              <WhatsAppThread messages={waMessages} />
              <WhatsAppSendBox leadId={lead.id} hasPhone={!!lead.phone} />
            </TabsContent>
            <TabsContent value="activity" className="p-4 pt-6 space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No activity logged yet.</div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border-b pb-4 last:border-0">
                      <div className="text-sm font-medium">{activity.type}</div>
                      <div className="text-sm text-slate-600 mt-1">{activity.content}</div>
                      <div className="text-xs text-slate-400 mt-2">
                        {activity.createdAt.toLocaleDateString()} {activity.createdAt.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="emails" className="p-4 pt-6 space-y-4">
              <EmailSendBox leadId={lead.id} email={lead.email} />
            </TabsContent>
            <TabsContent value="notes" className="p-4 pt-6 space-y-6">
              <AddNoteForm leadId={lead.id} />
              <div className="space-y-4">
                {activities.filter(a => a.type === 'note').length === 0 ? (
                  <div className="text-center py-10 text-slate-500">No notes added.</div>
                ) : (
                  activities.filter(a => a.type === 'note').map((note) => (
                    <div key={note.id} className="bg-slate-50 p-4 rounded-lg border">
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</div>
                      <div className="text-xs text-slate-400 mt-2">
                        {note.createdAt.toLocaleDateString()} {note.createdAt.toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
