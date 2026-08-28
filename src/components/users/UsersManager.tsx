"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  createUserAction,
  setUserActiveAction,
  setUserTeamAction,
  setUserRoleAction,
  deleteUserAction,
} from "@/lib/actions/users"
import { createTeamAction } from "@/lib/actions/teams"
import { inviteUserAction } from "@/lib/actions/invitations"
import { UserPlus, Plus, Trash2, Mail } from "lucide-react"

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  roleId: string | null;
  teamId: string | null;
};
type Team = { id: string; name: string };
type Role = { id: string; name: string };

const NO_TEAM = "__none__"; // Select can't use "" as a value
const NO_ROLE = "__none__";

export function UsersManager({
  initialUsers,
  initialTeams,
  roles,
  currentUserId,
}: {
  initialUsers: User[];
  initialTeams: Team[];
  roles: Role[];
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [teams, setTeams] = React.useState<Team[]>(initialTeams);
  const [teamName, setTeamName] = React.useState("");
  const [form, setForm] = React.useState({ firstName: "", lastName: "", email: "", password: "", roleId: NO_ROLE });
  const [saving, setSaving] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState(NO_ROLE);
  const [inviting, setInviting] = React.useState(false);

  async function invite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteUserAction({ email: inviteEmail.trim(), roleId: inviteRole === NO_ROLE ? null : inviteRole });
      setInviteEmail(""); setInviteRole(NO_ROLE);
      toast({ title: "Invitation sent", description: "They'll get an email with a link to join." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not send invite", description: e?.message });
    } finally {
      setInviting(false);
    }
  }

  async function createTeam() {
    if (!teamName.trim()) return;
    try {
      const t = await createTeamAction({ name: teamName.trim() });
      setTeams((prev) => [...prev, t as Team]);
      setTeamName("");
      toast({ title: "Team created" });
    } catch {
      toast({ variant: "destructive", title: "Could not create team" });
    }
  }

  async function assignTeam(u: User, value: string) {
    const teamId = value === NO_TEAM ? null : value;
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, teamId } : x)));
    try {
      await setUserTeamAction(u.id, teamId);
    } catch {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, teamId: u.teamId } : x)));
      toast({ variant: "destructive", title: "Could not update team" });
    }
  }

  async function assignRole(u: User, value: string) {
    const roleId = value === NO_ROLE ? null : value;
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, roleId } : x)));
    try {
      await setUserRoleAction(u.id, roleId);
      toast({ title: "Role updated" });
    } catch (e: any) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, roleId: u.roleId } : x)));
      toast({ variant: "destructive", title: "Could not update role", description: e?.message });
    }
  }

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create() {
    if (!form.email.trim() || form.password.length < 6) return;
    setSaving(true);
    try {
      const u = await createUserAction({
        email: form.email.trim(),
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        password: form.password,
        roleId: form.roleId === NO_ROLE ? null : form.roleId,
      });
      setUsers((prev) => [...prev, u as User]);
      setForm({ firstName: "", lastName: "", email: "", password: "", roleId: NO_ROLE });
      toast({ title: "User created" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not create user", description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(u: User) {
    const next = !u.isActive;
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)));
    try {
      await setUserActiveAction(u.id, next);
    } catch (e: any) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: u.isActive } : x)));
      toast({ variant: "destructive", title: "Could not update user", description: e?.message });
    }
  }

  async function remove(u: User) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    const prev = users;
    setUsers((p) => p.filter((x) => x.id !== u.id));
    try {
      await deleteUserAction(u.id);
      toast({ title: "User deleted" });
    } catch (e: any) {
      setUsers(prev);
      toast({ variant: "destructive", title: "Could not delete user", description: e?.message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
        <h3 className="font-semibold">Teams</h3>
        <div className="flex flex-wrap gap-1.5">
          {teams.length === 0 && <span className="text-xs text-slate-400">No teams yet</span>}
          {teams.map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
        </div>
        <div className="flex gap-2">
          <Input placeholder="New team name" value={teamName} onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createTeam(); } }} className="flex-1" />
          <Button variant="outline" onClick={createTeam} disabled={!teamName.trim()} className="gap-1">
            <Plus className="h-4 w-4" /> Add team
          </Button>
        </div>
      </div>

      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">Invite by email</h3></div>
        <p className="text-sm text-slate-500">They set their own password via a secure link — no need to share one.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1" />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="sm:w-40"><SelectValue placeholder="No role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ROLE}>No role</SelectItem>
              {roles.map((r) => <SelectItem key={r.id} value={r.id} className="capitalize">{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={invite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
            <Mail className="h-4 w-4" />{inviting ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </div>

      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-4">
        <h3 className="font-semibold">Or add a member directly</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="First name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          <Input placeholder="Last name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <Input type="password" placeholder="Initial password (min 6)" value={form.password}
            onChange={(e) => set("password", e.target.value)} />
          <Select value={form.roleId} onValueChange={(v) => set("roleId", v)}>
            <SelectTrigger><SelectValue placeholder="No role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ROLE}>No role</SelectItem>
              {roles.map((r) => <SelectItem key={r.id} value={r.id} className="capitalize">{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button onClick={create} disabled={saving || !form.email.trim() || form.password.length < 6} className="gap-2">
            <UserPlus className="h-4 w-4" />{saving ? "Creating…" : "Create user"}
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-white shadow-sm divide-y">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <div key={u.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</span>
                <span className="text-sm text-slate-500">{u.email}</span>
                {isSelf && <Badge variant="outline">You</Badge>}
                <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select value={u.roleId ?? NO_ROLE} onValueChange={(v) => assignRole(u, v)} disabled={isSelf}>
                  <SelectTrigger className="w-32 h-9"><SelectValue placeholder="No role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ROLE}>No role</SelectItem>
                    {roles.map((r) => <SelectItem key={r.id} value={r.id} className="capitalize">{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={u.teamId ?? NO_TEAM} onValueChange={(v) => assignTeam(u, v)}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="No team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEAM}>No team</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => toggle(u)} disabled={isSelf}>
                  {u.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(u)} disabled={isSelf}
                  title={isSelf ? "You cannot delete yourself" : "Delete user"}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
