"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Kanban,
  LayoutDashboard,
  CheckSquare,
  Settings,
  Activity,
  Zap,
  Network,
} from "lucide-react";

const routes = [
  { label: 'Executive Dashboard', icon: LayoutDashboard, href: '/', group: 'Analytics' },
  { label: 'My Dashboard', icon: Activity, href: '/my-dashboard', group: 'Analytics' },
  { label: 'Leads', icon: Users, href: '/leads', group: 'CRM' },
  { label: 'Pipeline', icon: Kanban, href: '/leads/kanban', group: 'CRM' },
  { label: 'Follow-ups', icon: CheckSquare, href: '/follow-ups', group: 'Productivity' },
  { label: 'Automations', icon: Zap, href: '/automations', group: 'Productivity' },
  { label: 'Sources', icon: Network, href: '/settings/sources', group: 'Settings' },
  { label: 'Settings', icon: Settings, href: '/settings', group: 'Settings' },
];

const groups = ['Analytics', 'CRM', 'Productivity', 'Settings'];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col h-full w-64 flex-shrink-0 border-r border-border bg-card">
      <div className="h-14 flex items-center px-6 border-b border-border">
        <span className="text-base font-semibold tracking-tight">Privyr</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {groups.map((group) => (
          <div key={group} className="space-y-1">
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {group}
            </p>
            {routes.filter((r) => r.group === group).map((route) => {
              const active = pathname === route.href;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  )}
                >
                  <route.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  {route.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
