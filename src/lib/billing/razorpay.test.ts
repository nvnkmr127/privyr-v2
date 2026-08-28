import { describe, it, expect } from "vitest";
import crypto from "crypto";

// The module reads env at import time, so set secrets before importing it.
const SECRET = "test_secret";
process.env.RAZORPAY_KEY_ID = "rzp_test_123";
process.env.RAZORPAY_KEY_SECRET = SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;

const { verifyPaymentSignature, verifyWebhookSignature, isConfigured } = await import("./razorpay");

function sign(payload: string) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

describe("razorpay signature verification", () => {
  it("reports configured when keys are present", () => {
    expect(isConfigured()).toBe(true);
  });

  it("accepts a correct payment signature and rejects a forged one", () => {
    const paymentId = "pay_abc";
    const subscriptionId = "sub_xyz";
    const good = sign(`${paymentId}|${subscriptionId}`);
    expect(verifyPaymentSignature({ paymentId, subscriptionId, signature: good })).toBe(true);
    expect(verifyPaymentSignature({ paymentId, subscriptionId, signature: "deadbeef" })).toBe(false);
  });

  it("verifies webhook signatures over the raw body", () => {
    const body = JSON.stringify({ event: "subscription.charged" });
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
    expect(verifyWebhookSignature(body, sign(body + "x"))).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });
});
