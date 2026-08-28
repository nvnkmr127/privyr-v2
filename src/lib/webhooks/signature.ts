import crypto from "crypto";

// Meta / most BSP webhooks sign the raw request body as `sha256=<hex>` in the
// `x-hub-signature-256` header, HMAC-SHA256 keyed on the app secret. Constant-time compare.
export function verifyMetaSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
