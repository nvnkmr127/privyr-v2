import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyMetaSignature } from "./signature";

const secret = "app-secret";
const body = '{"object":"page","entry":[]}';
const good = "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

describe("verifyMetaSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyMetaSignature(body, good, secret)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyMetaSignature(body + " ", good, secret)).toBe(false);
  });
  it("rejects a wrong secret", () => {
    expect(verifyMetaSignature(body, good, "other")).toBe(false);
  });
  it("rejects a missing/garbage header", () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, "sha256=deadbeef", secret)).toBe(false);
  });
});
