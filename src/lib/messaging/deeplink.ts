// One-tap messaging: render templates and build native deep links.
// Pure functions, no deps — WhatsApp/SMS/Email open in the user's own app.

export type Channel = "whatsapp" | "sms" | "email";

export interface LeadLike {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}

// Replace {{token}} placeholders with lead fields. Unknown tokens are left blank.
export function renderTemplate(body: string, lead: LeadLike): string {
  const firstName = (lead.name || "").trim().split(/\s+/)[0] || "";
  const map: Record<string, string> = {
    name: lead.name || "",
    first_name: firstName,
    email: lead.email || "",
    phone: lead.phone || "",
    company: lead.company || "",
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => map[key] ?? "");
}

// Build a deep link that opens the native messaging app with text prefilled.
// Returns null when the lead lacks the field the channel needs.
export function buildDeepLink(
  channel: Channel,
  lead: LeadLike,
  text: string,
  subject?: string
): string | null {
  const encoded = encodeURIComponent(text);
  switch (channel) {
    case "whatsapp": {
      const digits = (lead.phone || "").replace(/\D/g, "");
      if (!digits) return null;
      return `https://wa.me/${digits}?text=${encoded}`;
    }
    case "sms": {
      const phone = (lead.phone || "").replace(/[^\d+]/g, "");
      if (!phone) return null;
      // ponytail: `?body=` works on Android; iOS wants `&body=`. Android form is the common case.
      return `sms:${phone}?body=${encoded}`;
    }
    case "email": {
      if (!lead.email) return null;
      const q = new URLSearchParams();
      if (subject) q.set("subject", subject);
      q.set("body", text);
      return `mailto:${lead.email}?${q.toString()}`;
    }
  }
}
