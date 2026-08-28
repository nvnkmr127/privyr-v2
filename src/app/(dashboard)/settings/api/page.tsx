import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireOrg, hasPermission } from "@/lib/rbac";
import { ApiKeyService } from "@/domains/apiKeys/service";
import { ApiKeysManager } from "@/components/settings/ApiKeysManager";

export default async function ApiKeysPage() {
  if (!(await hasPermission("api.manage"))) redirect("/leads");
  const { organizationId } = await requireOrg();
  const keys = await ApiKeyService.list(organizationId);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/settings"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Access</h2>
          <p className="text-sm text-slate-500">Programmatic access to your leads via the REST API.</p>
        </div>
      </div>
      <ApiKeysManager initial={keys} />
    </div>
  );
}
