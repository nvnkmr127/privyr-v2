import { requireAuth } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getEmailOptOutAction } from "@/lib/actions/notificationPrefs";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";

export default async function ProfilePage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const emailOptOut = await getEmailOptOutAction();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">User Profile</h1>
      <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
        <p><strong>Name:</strong> {session.user?.name}</p>
        <p><strong>Email:</strong> {session.user?.email}</p>
        <p className="mt-4 text-sm text-slate-500">
          This is a protected route. Only authenticated users can see this page.
        </p>
      </div>

      <NotificationPreferences initialOptOut={emailOptOut} />
      <form action="/api/auth/signout" method="POST">
        <Button variant="outline" type="submit">Logout</Button>
      </form>
    </div>
  );
}
