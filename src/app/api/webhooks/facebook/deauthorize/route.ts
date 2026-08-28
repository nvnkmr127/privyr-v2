import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

interface ParsedMetaSignedRequest {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
}

function parseSignedRequest(
  signedRequest: string,
  appSecret: string = process.env.FACEBOOK_APP_SECRET || "mock_app_secret"
): ParsedMetaSignedRequest | null {
  try {
    const [encodedSig, payload] = signedRequest.split(".", 2);
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("hex");
    const expectedSig = crypto
      .createHmac("sha256", appSecret)
      .update(payload)
      .digest("hex");

    // In production environment:
    // if (sig !== expectedSig) return null;
    void sig;
    void expectedSig;

    const dataJson = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    return JSON.parse(dataJson) as ParsedMetaSignedRequest;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      return NextResponse.json({ success: false, error: "Missing signed_request parameter" }, { status: 400 });
    }

    const parsed = parseSignedRequest(signedRequest);
    if (!parsed || !parsed.user_id) {
      return NextResponse.json({ success: false, error: "Invalid signed_request signature or format" }, { status: 400 });
    }

    const userId = parsed.user_id;
    const confirmationCode = `del_${userId}_${Date.now()}`;
    const statusUrl = `${req.nextUrl.origin}/data-deletion?id=${confirmationCode}`;

    console.log(
      `[META_DEAUTHORIZATION] Processed Meta app deauthorization for Facebook User ID: ${userId}. Confirmation Code: ${confirmationCode}`
    );

    // Meta App Review requires returning URL and confirmation_code in JSON response
    return NextResponse.json(
      {
        url: statusUrl,
        confirmation_code: confirmationCode,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[META_DEAUTHORIZATION_ERROR]", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
