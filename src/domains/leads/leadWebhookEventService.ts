// No static `crypto` import: this module is reachable from instrumentation.ts, whose graph is
// also compiled for the edge runtime where the node `crypto` builtin can't be bundled. We use the
// global Web Crypto for the UUID and lazy-load node crypto for HMAC (same pattern as the webhook routes).

export interface WebhookEventPayload {
  eventId: string;
  event: "lead.created" | "lead.status_changed" | "lead.hot_threshold" | "lead.stagnant_alert";
  timestamp: string;
  organizationId: string;
  data: Record<string, any>;
}

export class LeadWebhookEventService {
  /**
   * Constructs standardized Webhook JSON event payload.
   */
  static constructPayload(
    organizationId: string,
    event: WebhookEventPayload["event"],
    data: Record<string, any>
  ): WebhookEventPayload {
    return {
      eventId: `evt_${globalThis.crypto.randomUUID().replace(/-/g, "")}`,
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
    };
  }

  /**
   * Generates HMAC-SHA256 signature header value for payload verification.
   */
  static async generateSignature(payloadString: string, webhookSecret: string): Promise<string> {
    const { createHmac } = await import("crypto");
    return createHmac("sha256", webhookSecret).update(payloadString).digest("hex");
  }

  /**
   * POSTs the signed webhook to the endpoint. Returns the HTTP status; the caller (worker) decides
   * retry/DLQ. A network error or timeout surfaces as success:false with statusCode 0.
   */
  static async dispatchWebhook(
    endpointUrl: string,
    webhookSecret: string,
    payload: WebhookEventPayload
  ): Promise<{ success: boolean; statusCode: number; payload: WebhookEventPayload; signature: string }> {
    const body = JSON.stringify(payload);
    const signature = await this.generateSignature(body, webhookSecret);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000); // 10s hard timeout
      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Privyr-Signature": signature,
          "X-Privyr-Event": payload.event,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return {
        success: res.status >= 200 && res.status < 300,
        statusCode: res.status,
        payload,
        signature,
      };
    } catch {
      // Network error / timeout / DNS — treat as a delivery failure so it retries.
      return { success: false, statusCode: 0, payload, signature };
    }
  }
}
