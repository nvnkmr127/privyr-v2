import { requireAuth } from "@/lib/rbac";
import { db } from "@/db";
import { followUps, leads } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function FollowUpsDashboard() {
  const session = await requireAuth();
  
  // Fetch follow-ups for the user
  const userFollowUps = await db
    .select({
      followUp: followUps,
      lead: leads,
    })
    .from(followUps)
    .innerJoin(leads, eq(followUps.leadId, leads.id))
    .where(eq(followUps.userId, session.user.id))
    .orderBy(asc(followUps.dueAt));

  const now = new Date();
  
  // Basic grouping
  const overdue = userFollowUps.filter(f => f.followUp.status === 'pending' && new Date(f.followUp.dueAt) < now);
  const completed = userFollowUps.filter(f => f.followUp.status === 'completed');
  const upcoming = userFollowUps.filter(f => f.followUp.status === 'pending' && new Date(f.followUp.dueAt) >= now);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Follow-ups</h1>
        <a href="/follow-ups/calendar" className="text-sm font-medium text-blue-600 hover:underline">Calendar view →</a>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle>Due Today</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{upcoming.filter(f => new Date(f.followUp.dueAt).toDateString() === now.toDateString()).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-red-500">Overdue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{overdue.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>Upcoming</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{upcoming.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-green-500">Completed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-500">{completed.length}</p></CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Pending Actions</h2>
        {overdue.length > 0 && (
          <div className="bg-red-50 p-4 rounded-md space-y-2 border border-red-100">
            <h3 className="font-semibold text-red-800">Overdue</h3>
            {overdue.map((f) => (
              <div key={f.followUp.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-red-200">
                <div>
                  <p className="font-medium">{f.followUp.title} ({f.followUp.type})</p>
                  <p className="text-sm text-slate-500">Lead: {f.lead.name}</p>
                </div>
                <div className="text-sm font-semibold text-red-600">
                  {format(new Date(f.followUp.dueAt), 'MMM d, h:mm a')}
                </div>
              </div>
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-md space-y-2 border border-slate-100">
            <h3 className="font-semibold text-slate-800">Upcoming</h3>
            {upcoming.map((f) => (
              <div key={f.followUp.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-slate-200">
                <div>
                  <p className="font-medium">{f.followUp.title} ({f.followUp.type})</p>
                  <p className="text-sm text-slate-500">Lead: {f.lead.name}</p>
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  {format(new Date(f.followUp.dueAt), 'MMM d, h:mm a')}
                </div>
              </div>
            ))}
          </div>
        )}

        {upcoming.length === 0 && overdue.length === 0 && (
          <p className="text-slate-500 italic">No pending follow-ups.</p>
        )}
      </div>
    </div>
  );
}
