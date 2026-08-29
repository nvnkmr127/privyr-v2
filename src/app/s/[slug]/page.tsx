import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ContentSharingService } from "@/domains/leads/contentSharingService";

// Public, unauthenticated branded page. Opening it records the view (read receipt) and
// shows the lead an auto-personalized page with the sender's branding + a CTA to the content.
export default async function SharedContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ua = (await headers()).get("user-agent") ?? undefined;
  const page = await ContentSharingService.openPage(slug, ua);

  if (!page) notFound();

  const sender = [page.ownerName, page.orgName].filter(Boolean).join(" · ");
  const initial = (page.orgName || page.ownerName || "•").charAt(0).toUpperCase();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
          {initial}
        </div>

        <div className="space-y-1">
          {page.leadName !== "there" && (
            <p className="text-sm text-muted-foreground">Hi {page.leadName},</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{page.title}</h1>
          {sender && <p className="text-sm text-muted-foreground">Shared with you by {sender}</p>}
        </div>

        <a
          href={page.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open content <ExternalLink className="h-4 w-4" />
        </a>

        <p className="text-xs text-muted-foreground">Sent securely via Privyr</p>
      </div>
    </main>
  );
}
