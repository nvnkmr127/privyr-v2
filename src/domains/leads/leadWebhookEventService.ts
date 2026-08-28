import crypto from "crypto";

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
      eventId: `evt_${crypto.randomUUID().replace(/-/g, "")}`,
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
    };
  }

  /**
   * Generates HMAC-SHA256 signature header value for payload verification.
   */
  static generateSignature(payloadString: string, webhookSecret: string): string {
    return crypto.createHmac("sha256", webhookSecret).update(payloadString).digest("hex");
  }

  /**
   * Simulates dispatching Webhook HTTP POST request with X-Privyr-Signature header.
   */
  static async dispatchWebhook(
    endpointUrl: string,
    webhookSecret: string,
    payload: WebhookEventPayload
  ): Promise<{ success: boolean; statusCode: number; payload: WebhookEventPayload; signature: string }> {
    const body = JSON.stringify(payload);
    const signature = this.generateSignature(body, webhookSecret);

    // In a real production HTTP client, fetch(endpointUrl, { method: "POST", headers: { "X-Privyr-Signature": signature, "Content-Type": "application/json" }, body })
    return {
      success: true,
      statusCode: 200,
      payload,
      signature,
    };
  }
}
