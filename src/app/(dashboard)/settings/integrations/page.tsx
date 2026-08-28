import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrg } from "@/lib/rbac";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { GoogleCalendarService } from "@/domains/integrations/googleCalendarService";
import { isConfigured as googleConfigured } from "@/lib/integrations/google";
import { GoogleConnect } from "@/components/settings/GoogleConnect";

export default async function IntegrationsPage() {
  await requireOrg();
  const session = await getServerSession(authOptions);
  const connected = session?.user?.id ? await GoogleCalendarService.isConnected(session.user.id) : false;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/settings"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
          <p className="text-sm text-slate-500">Connect external services to your account.</p>
        </div>
      </div>
      <GoogleConnect connected={connected} configured={googleConfigured()} />
    </div>
  );
}
