import { InvitationService } from "@/domains/invitations/service";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await InvitationService.peek(token);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-2xl bg-card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Accept your invitation</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your account to join the workspace.</p>
        </div>
        {invite ? (
          <AcceptInviteForm token={token} email={invite.email} />
        ) : (
          <div className="text-sm text-foreground">This invitation is invalid or has expired. Ask an admin to send a new one.</div>
        )}
      </div>
    </div>
  );
}
