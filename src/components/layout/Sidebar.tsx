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
  Network
} from "lucide-react";

const routes = [
  { label: 'Executive Dashboard', icon: LayoutDashboard, href: '/', group: 'Analytics' },
  { label: 'My Dashboard', icon: Activity, href: '/my-dashboard', group: 'Analytics' },
  { label: 'Leads', icon: Users, href: '/leads', group: 'CRM' },
  { label: 'Pipeline (Kanban)', icon: Kanban, href: '/leads/kanban', group: 'CRM' },
  { label: 'Follow-ups', icon: CheckSquare, href: '/follow-ups', group: 'Productivity' },
  { label: 'Automations', icon: Zap, href: '/automations', group: 'Productivity' },
  { label: 'Sources', icon: Network, href: '/settings/sources', group: 'Settings' },
  { label: 'Settings', icon: Settings, href: '/settings', group: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white w-64 flex-shrink-0">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-xl font-bold tracking-tight">
          PrivryCRM
        </h2>
        <div className="space-y-1 mt-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400",
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", pathname === route.href ? "text-blue-400" : "")} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
