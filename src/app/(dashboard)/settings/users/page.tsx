import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserService } from "@/domains/users/service";
import { TeamService } from "@/domains/teams/service";
import { RoleService } from "@/domains/roles/service";
import { requireOrg, hasPermission } from "@/lib/rbac";
import { UsersManager } from "@/components/users/UsersManager";
import { RolesManager } from "@/components/users/RolesManager";

export default async function UsersPage() {
  if (!(await hasPermission("users.manage"))) redirect("/leads");
  const { organizationId, userId } = await requireOrg();
  const canManageRoles = await hasPermission("roles.manage");
  const [users, teams, roles] = await Promise.all([
    UserService.list(organizationId),
    TeamService.list(organizationId),
    RoleService.list(organizationId),
  ]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users &amp; Roles</h2>
          <p className="text-sm text-slate-500">Invite teammates, assign roles, and manage access.</p>
        </div>
      </div>

      <UsersManager
        initialUsers={users}
        initialTeams={teams}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
        currentUserId={userId}
      />

      {canManageRoles && <RolesManager initialRoles={roles} />}
    </div>
  );
}
