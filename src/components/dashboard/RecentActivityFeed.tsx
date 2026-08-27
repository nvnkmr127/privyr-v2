import Link from "next/link";
import { Activity, Clock, MessageSquare, UserCheck, Tag, FileText } from "lucide-react";

export interface ActivityItem {
  id: string;
  leadId: string;
  leadName: string;
  userName: string;
  type: string;
  content: string | null;
  occurredAt: Date;
}

export function RecentActivityFeed({ activities }: { activities: ActivityItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-500">
        <Activity className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm font-medium">No recent activity logged</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "note":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "assignment":
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      case "tag":
        return <Tag className="h-4 w-4 text-emerald-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((item) => (
        <div key={item.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
          <div className="mt-0.5 rounded-full p-1 bg-slate-100">{getIcon(item.type)}</div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{item.userName}</span>
              <span className="text-slate-400">
                {new Date(item.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {item.content || `Logged ${item.type}`} for{" "}
              <Link href={`/leads/${item.leadId}`} className="font-medium text-blue-600 hover:underline">
                {item.leadName}
              </Link>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
