import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { getAuthUrl, isConfigured } from "@/lib/integrations/google";

// Kicks off the Google OAuth consent flow for the signed-in user.
export async function GET() {
  const session = await requireAuth();
  if (!isConfigured()) {
    return NextResponse.json({ error: "Google integration is not configured" }, { status: 400 });
  }
  return NextResponse.redirect(getAuthUrl(session.user.id));
}
