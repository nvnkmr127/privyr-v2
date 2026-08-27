// Watxio (WhatsApp Business API BSP) client — the ONLY file that knows Watxio's wire format.
// Shaped on the common Meta-BSP pattern: POST /messages, Bearer token, { to, type, ... }.
// Three unknowns are marked WATXIO_DOC below — confirm against Watxio's real API docs and
// nothing else in the codebase changes.

export interface SendResult {
  providerMessageId: string;
  status: "sent" | "queued";
}

interface WatxioConfig {
  baseUrl: string;
  apiKey: string;
  phoneNumberId: string;
}

// ponytail: creds from env — single WhatsApp number. Move to integrationAccounts when you
// need multiple numbers / multi-tenant, then pass the resolved config into these methods.
function config(): WatxioConfig {
  const baseUrl = process.env.WATXIO_BASE_URL;
  const apiKey = process.env.WATXIO_API_KEY;
  const phoneNumberId = process.env.WATXIO_PHONE_NUMBER_ID;
  if (!baseUrl || !apiKey || !phoneNumberId) {
    throw new Error("Watxio not configured: set WATXIO_BASE_URL, WATXIO_API_KEY, WATXIO_PHONE_NUMBER_ID");
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, phoneNumberId };
}

async function post(path: string, body: unknown): Promise<any> {
  const { baseUrl, apiKey } = config();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      // WATXIO_DOC #1: auth header. Bearer is the common BSP default; some use "apikey: <key>".
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Watxio ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// Digits only, no '+', matching wa.me / Meta convention.
function toNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

// WATXIO_DOC #3: response shape. Meta returns { messages: [{ id }] }; adjust the pick if Watxio differs.
function pickResult(json: any): SendResult {
  const id = json?.messages?.[0]?.id ?? json?.id ?? json?.messageId;
  if (!id) throw new Error(`Watxio: no message id in response ${JSON.stringify(json)}`);
  return { providerMessageId: String(id), status: "sent" };
}

export const WatxioClient = {
  // Free-form session message — only valid inside the 24h customer-service window.
  async sendText(phone: string, body: string): Promise<SendResult> {
    const { phoneNumberId } = config();
    // WATXIO_DOC #2: send-message endpoint + body. Meta shape shown.
    const json = await post(`/${phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      to: toNumber(phone),
      type: "text",
      text: { body },
    });
    return pickResult(json);
  },

  // Pre-approved template (HSM) — required outside the 24h window (e.g. first contact with a new lead).
  // variables fill the template's {{1}}, {{2}}, ... body placeholders in order.
  async sendTemplate(
    phone: string,
    templateName: string,
    variables: string[] = [],
    languageCode = "en",
  ): Promise<SendResult> {
    const { phoneNumberId } = config();
    const json = await post(`/${phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      to: toNumber(phone),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: variables.length
          ? [{ type: "body", parameters: variables.map((v) => ({ type: "text", text: v })) }]
          : [],
      },
    });
    return pickResult(json);
  },
};
