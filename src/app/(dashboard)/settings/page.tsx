import { getOrganizationAction } from "@/lib/actions/organizations";
import { GeneralSettingsForm } from "@/components/settings/GeneralSettingsForm";
import Link from "next/link";
import { Sliders, Database, MessageSquare, Users, ListPlus, KeyRound, ScrollText, CreditCard, Plug } from "lucide-react";

export default async function SettingsPage() {
  const organization = await getOrganizationAction();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your Privyr v2 lead management platform configuration, status schemas, and team preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-1 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 h-fit">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
            Navigation
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
          >
            <Sliders className="h-4 w-4" />
            General & Statuses
          </Link>
          <Link
            href="/settings/sources"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Database className="h-4 w-4" />
            Lead Sources
          </Link>
          <Link
            href="/settings/templates"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <MessageSquare className="h-4 w-4" />
            Message Templates
          </Link>
          <Link
            href="/settings/users"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Users className="h-4 w-4" />
            Users & Roles
          </Link>
          <Link
            href="/settings/custom-fields"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ListPlus className="h-4 w-4" />
            Custom Fields
          </Link>
          <Link
            href="/settings/api"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <KeyRound className="h-4 w-4" />
            API Access
          </Link>
          <Link
            href="/settings/audit"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ScrollText className="h-4 w-4" />
            Audit Log
          </Link>
          <Link
            href="/settings/billing"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <CreditCard className="h-4 w-4" />
            Billing & Plan
          </Link>
          <Link
            href="/settings/integrations"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Plug className="h-4 w-4" />
            Integrations
          </Link>
        </aside>

        <main className="lg:col-span-3">
          <GeneralSettingsForm organization={organization} />
        </main>
      </div>
    </div>
  );
}
