// Parse a Watxio inbound webhook into flat messages + statuses.
// Shaped on Meta's webhook format (entry[].changes[].value.{messages,statuses}), which most
// BSPs proxy verbatim. WATXIO_DOC: if Watxio uses a different envelope, this is the only edit.

export interface InboundMessage { from: string; id: string; body: string }
export interface StatusUpdate { id: string; status: string }

export function parseWebhook(body: any): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];

  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      for (const m of value.messages ?? []) {
        // Only text messages carry a body we can log as-is; skip media/etc for now.
        const text = m?.text?.body;
        if (m?.from && m?.id && typeof text === "string") {
          messages.push({ from: String(m.from), id: String(m.id), body: text });
        }
      }
      for (const s of value.statuses ?? []) {
        if (s?.id && s?.status) statuses.push({ id: String(s.id), status: String(s.status) });
      }
    }
  }
  return { messages, statuses };
}
