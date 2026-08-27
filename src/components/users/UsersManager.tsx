"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createUserAction, setUserActiveAction, setUserTeamAction } from "@/lib/actions/users"
import { createTeamAction } from "@/lib/actions/teams"
import { UserPlus, Plus } from "lucide-react"

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  teamId: string | null;
};
type Team = { id: string; name: string };

const NO_TEAM = "__none__"; // Select can't use "" as a value

export function UsersManager({ initialUsers, initialTeams }: { initialUsers: User[]; initialTeams: Team[] }) {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [teams, setTeams] = React.useState<Team[]>(initialTeams);
  const [teamName, setTeamName] = React.useState("");
  const [form, setForm] = React.useState({ firstName: "", lastName: "", email: "", password: "" });
  const [saving, setSaving] = React.useState(false);

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
      });
      setUsers((prev) => [...prev, u as User]);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
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
    } catch {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: u.isActive } : x)));
      toast({ variant: "destructive", title: "Could not update user" });
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

      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-4">
        <h3 className="font-semibold">Add a team member</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="First name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          <Input placeholder="Last name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <Input type="password" placeholder="Initial password (min 6)" value={form.password}
            onChange={(e) => set("password", e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={create} disabled={saving || !form.email.trim() || form.password.length < 6} className="gap-2">
            <UserPlus className="h-4 w-4" />{saving ? "Creating…" : "Create user"}
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-white shadow-sm divide-y">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="font-medium">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</span>
              <span className="text-sm text-slate-500">{u.email}</span>
              <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={u.teamId ?? NO_TEAM} onValueChange={(v) => assignTeam(u, v)}>
                <SelectTrigger className="w-40 h-9"><SelectValue placeholder="No team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM}>No team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => toggle(u)}>
                {u.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
