import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { exchangeCode, verifyState } from "@/lib/integrations/google";
import { GoogleCalendarService } from "@/domains/integrations/googleCalendarService";
import { appUrl } from "@/lib/mail/mailer";

// OAuth redirect target. Runs in the connecting user's session, so we bind the CSRF state to them.
export async function GET(req: NextRequest) {
  const session = await requireAuth();
  const q = req.nextUrl.searchParams;
  const code = q.get("code");
  const state = q.get("state");

  if (!code || !state) return NextResponse.redirect(appUrl("/settings/integrations?google=error"));
  const stateUser = verifyState(state);
  if (!stateUser || stateUser !== session.user.id) {
    return NextResponse.redirect(appUrl("/settings/integrations?google=invalid_state"));
  }

  try {
    const tokens = await exchangeCode(code);
    await GoogleCalendarService.connect(session.user.id, tokens);
    return NextResponse.redirect(appUrl("/settings/integrations?google=connected"));
  } catch (e) {
    console.error("[google-callback]", e);
    return NextResponse.redirect(appUrl("/settings/integrations?google=error"));
  }
}
