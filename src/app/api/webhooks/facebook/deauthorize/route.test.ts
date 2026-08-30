import { describe, expect, it, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { POST } from "./route";
import { NextRequest } from "next/server";

const SECRET = "test_app_secret";

function signedRequest(payloadObj: object, secret = SECRET): string {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${sig}.${payload}`;
}

function post(signed: string) {
  const formData = new FormData();
  formData.append("signed_request", signed);
  return POST(new NextRequest("http://localhost:3000/api/webhooks/facebook/deauthorize", { method: "POST", body: formData }));
}

describe("Meta App Deauthorization Webhook Callback Endpoint", () => {
  const orig = process.env.FACEBOOK_APP_SECRET;
  beforeEach(() => { process.env.FACEBOOK_APP_SECRET = SECRET; });
  afterEach(() => { process.env.FACEBOOK_APP_SECRET = orig; });

  it("accepts a correctly signed request and returns status URL + confirmation_code", async () => {
    const res = await post(signedRequest({ user_id: "fb_user_67890", algorithm: "HMAC-SHA256" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("/data-deletion?id=del_fb_user_67890_");
    expect(json.confirmation_code).toContain("del_fb_user_67890_");
  });

  it("rejects a request whose signature does not match (400, no fake accept)", async () => {
    const bad = signedRequest({ user_id: "attacker" }, "wrong_secret");
    const res = await post(bad);
    expect(res.status).toBe(400);
  });

  it("rejects when the app secret is not configured", async () => {
    delete process.env.FACEBOOK_APP_SECRET;
    const res = await post(signedRequest({ user_id: "x" }));
    expect(res.status).toBe(400);
  });
});
