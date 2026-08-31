import Link from "next/link";
import { Ban } from "lucide-react";

// Shown when a suspended org's user tries to use the app. Public (no auth needed).
export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Ban className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Workspace suspended</h1>
        <p className="text-sm text-muted-foreground">
          Access to this workspace has been paused. Please contact support to restore it.
        </p>
        <Link href="/login" className="inline-block text-sm text-muted-foreground underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
