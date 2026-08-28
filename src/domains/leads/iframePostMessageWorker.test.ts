import { describe, expect, it } from "vitest";
import { IframePostMessageWorker } from "./iframePostMessageWorker";

describe("IframePostMessageWorker (Cross-Origin Iframe Integration)", () => {
  it("should validate allowed origin domains correctly", () => {
    expect(IframePostMessageWorker.isAllowedOrigin("https://example.com", ["*"])).toBe(true);
    expect(IframePostMessageWorker.isAllowedOrigin("https://sub.mywebsite.com", ["mywebsite.com"])).toBe(true);
    expect(IframePostMessageWorker.isAllowedOrigin("https://malicious.com", ["mywebsite.com"])).toBe(false);
  });

  it("should process cross-origin iframe lead submission and return success result", async () => {
    const payload = {
      type: "PRIVYR_LEAD_SUBMISSION",
      tenantId: "tenant_org_100",
      source: "WordPress Landing Page",
      data: {
        name: "Arthur Dent",
        email: "arthur@earth.org",
        phone: "+442079460912",
        budget: "£42000",
        preferred_product: "Towel",
      },
    };

    const res = await IframePostMessageWorker.processIframePostMessage("https://wordpress.example.com", payload);

    expect(res.success).toBe(true);
    expect(res.allowedOrigin).toBe(true);
    expect(res.leadId).toContain("lead_iframe_");
  });

  it("should generate postMessage acknowledgment payload for parent window", () => {
    const ack = IframePostMessageWorker.createAckMessage({
      success: true,
      leadId: "lead_iframe_999",
      allowedOrigin: true,
    });

    expect(ack.type).toBe("PRIVYR_LEAD_ACK");
    expect(ack.status).toBe("success");
    expect(ack.leadId).toBe("lead_iframe_999");
  });
});
