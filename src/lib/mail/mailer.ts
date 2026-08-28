// Minimal mailer. With RESEND_API_KEY set it sends via Resend's REST API (no SDK needed);
// otherwise it logs to the console so invite/notification flows work end-to-end in dev.
// ponytail: swap-a-key to go live — add a provider branch here if you don't use Resend.

type Mail = { to: string; subject: string; html: string };

const FROM = process.env.MAIL_FROM || "Privyr <onboarding@resend.dev>";

export async function sendEmail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.html}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: mail.to, subject: mail.subject, html: mail.html }),
  });
  if (!res.ok) {
    throw new Error(`Email send failed (${res.status}): ${await res.text()}`);
  }
}

export function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
