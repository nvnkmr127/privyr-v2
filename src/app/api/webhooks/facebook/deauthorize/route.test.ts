import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("Meta App Deauthorization Webhook Callback Endpoint", () => {
  it("should process deauthorization request and return status URL and confirmation_code", async () => {
    const payloadObj = { user_id: "fb_user_67890", algorithm: "HMAC-SHA256" };
    const encodedPayload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
    const mockSignedRequest = `mock_signature.${encodedPayload}`;

    const formData = new FormData();
    formData.append("signed_request", mockSignedRequest);

    const req = new NextRequest("http://localhost:3000/api/webhooks/facebook/deauthorize", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.url).toContain("/data-deletion?id=del_fb_user_67890_");
    expect(json.confirmation_code).toContain("del_fb_user_67890_");
  });
});
