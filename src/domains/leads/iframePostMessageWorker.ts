import { UniversalLeadMappingService } from "@/domains/leads/universalLeadMappingService";

export interface IframeMessagePayload {
  type: string;
  tenantId?: string;
  source?: string;
  data: {
    name?: string;
    email?: string;
    phone?: string;
    budget?: string | number;
    [key: string]: any;
  };
}

export interface IframeProcessingResult {
  success: boolean;
  leadId?: string;
  error?: string;
  allowedOrigin: boolean;
}

export class IframePostMessageWorker {
  /**
   * Validates whether the event origin domain is allowed for cross-origin postMessage messaging.
   */
  static isAllowedOrigin(origin: string, allowedOrigins: string[] = ["*"]): boolean {
    if (!origin) return false;
    if (allowedOrigins.includes("*")) return true;
    return allowedOrigins.some((domain) => origin === domain || origin.endsWith(`.${domain}`));
  }

  /**
   * Processes cross-origin postMessage events sent from embedded iframe lead widgets.
   */
  static async processIframePostMessage(
    origin: string,
    payload: IframeMessagePayload,
    allowedOrigins: string[] = ["*"]
  ): Promise<IframeProcessingResult> {
    const isAllowed = this.isAllowedOrigin(origin, allowedOrigins);
    if (!isAllowed) {
      return { success: false, error: "Cross-origin domain not allowed", allowedOrigin: false };
    }

    if (payload.type !== "PRIVYR_LEAD_SUBMISSION" || !payload.data) {
      return { success: false, error: "Invalid postMessage event type or payload structure", allowedOrigin: true };
    }

    try {
      const mappedLead = UniversalLeadMappingService.mapLeadByProvider("webhook", {
        name: payload.data.name,
        email: payload.data.email,
        phone: payload.data.phone,
        budget: payload.data.budget,
        source: payload.source || `Embedded Iframe (${origin})`,
        customData: {
          ...payload.data,
          embed_origin: origin,
          tenant_id: payload.tenantId,
        },
      });

      const mockLeadId = `lead_iframe_${Date.now()}`;

      return {
        success: true,
        leadId: mockLeadId,
        allowedOrigin: true,
        error: mappedLead ? undefined : "Mapping failed",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to process iframe lead submission",
        allowedOrigin: true,
      };
    }
  }

  /**
   * Generates postMessage acknowledgment payload to post back to the parent iframe window.
   */
  static createAckMessage(result: IframeProcessingResult): { type: string; status: string; leadId?: string; error?: string } {
    return {
      type: "PRIVYR_LEAD_ACK",
      status: result.success ? "success" : "error",
      leadId: result.leadId,
      error: result.error,
    };
  }
}
