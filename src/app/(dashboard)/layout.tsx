import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ImpersonationBanner } from "@/components/platform/ImpersonationBanner";
import { FloatingAssistant } from "@/components/assistant/FloatingAssistant";
import { isSuperAdmin } from "@/lib/rbac";

// Every dashboard page is authed and DB-backed — render per request, never prerender at build.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const superAdmin = await isSuperAdmin();
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar isSuperAdmin={superAdmin} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ImpersonationBanner />
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <FloatingAssistant />
    </div>
  );
}
