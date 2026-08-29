import { Users, Kanban, LayoutDashboard, CheckSquare, Settings, Activity, Zap, Network, Snowflake, TrendingUp, type LucideIcon } from "lucide-react";

// Shared nav definition used by both the desktop Sidebar and the mobile drawer.
export interface NavRoute {
  label: string;
  icon: LucideIcon;
  href: string;
  group: string;
}

export const navRoutes: NavRoute[] = [
  { label: "Executive Dashboard", icon: LayoutDashboard, href: "/", group: "Analytics" },
  { label: "My Dashboard", icon: Activity, href: "/my-dashboard", group: "Analytics" },
  { label: "Insights", icon: TrendingUp, href: "/insights", group: "Analytics" },
  { label: "Leads", icon: Users, href: "/leads", group: "CRM" },
  { label: "Pipeline", icon: Kanban, href: "/leads/kanban", group: "CRM" },
  { label: "Going cold", icon: Snowflake, href: "/leads/cold", group: "CRM" },
  { label: "Follow-ups", icon: CheckSquare, href: "/follow-ups", group: "Productivity" },
  { label: "Automations", icon: Zap, href: "/automations", group: "Productivity" },
  { label: "Sources", icon: Network, href: "/settings/sources", group: "Settings" },
  { label: "Settings", icon: Settings, href: "/settings", group: "Settings" },
];

export const navGroups = ["Analytics", "CRM", "Productivity", "Settings"];
