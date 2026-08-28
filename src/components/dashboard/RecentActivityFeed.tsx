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
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm font-medium">No recent activity logged</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "message":
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
      case "note":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "assignment":
        return <UserCheck className="h-4 w-4 text-muted-foreground" />;
      case "tag":
        return <Tag className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((item) => (
        <div key={item.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
          <div className="mt-0.5 rounded-full p-1 bg-muted">{getIcon(item.type)}</div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">{item.userName}</span>
              <span className="text-muted-foreground">
                {new Date(item.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {item.content || `Logged ${item.type}`} for{" "}
              <Link href={`/leads/${item.leadId}`} className="font-medium text-muted-foreground hover:underline">
                {item.leadName}
              </Link>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
