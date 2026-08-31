import { getImpersonatedOrgId } from "@/lib/rbac";
import { PlatformService } from "@/domains/platform/service";
import { ExitImpersonationButton } from "./ExitImpersonationButton";

// Shows a persistent bar while a super-admin is acting inside a tenant, so it's never invisible
// which org's data you're changing. Renders nothing when not impersonating.
export async function ImpersonationBanner() {
  const orgId = await getImpersonatedOrgId();
  if (!orgId) return null;
  const org = await PlatformService.getOrg(orgId);

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-black">
      <span>Viewing as <strong>{org?.name ?? "tenant"}</strong> (super-admin impersonation)</span>
      <ExitImpersonationButton />
    </div>
  );
}
