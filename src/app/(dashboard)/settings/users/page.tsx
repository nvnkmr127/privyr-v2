import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserService } from "@/domains/users/service";
import { TeamService } from "@/domains/teams/service";
import { isAdmin } from "@/lib/rbac";
import { UsersManager } from "@/components/users/UsersManager";

export default async function UsersPage() {
  if (!(await isAdmin())) redirect("/leads");
  const [users, teams] = await Promise.all([UserService.list(), TeamService.list()]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users &amp; Roles</h2>
          <p className="text-sm text-slate-500">Add teammates so you can assign leads to them.</p>
        </div>
      </div>
      <UsersManager initialUsers={users} initialTeams={teams} />
    </div>
  );
}
