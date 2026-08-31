import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "@/domains/apiKeys/service";
import { verifyMobileToken } from "@/lib/mobileAuth";

export interface ApiAuth {
  organizationId: string;
  userId?: string; // present for mobile-token requests, absent for API-key requests
}

// Shared bearer auth for every /api/v1 route: a mobile-app JWT (carries userId) or a public API key.
// Returns the tenant scope, or a ready-to-return 401 response.
export async function authorizeApiRequest(req: NextRequest): Promise<ApiAuth | { error: NextResponse }> {
  const header = req.headers.get("authorization") ?? "";
  const raw = header.startsWith("Bearer ") ? header.slice(7) : "";

  const mobile = verifyMobileToken(raw);
  if (mobile) {
    if (await suspended(mobile.org)) return { error: suspendedResponse() };
    return { organizationId: mobile.org, userId: mobile.sub };
  }

  const key = await ApiKeyService.verify(raw);
  if (key) {
    if (await suspended(key.organizationId)) return { error: suspendedResponse() };
    return { organizationId: key.organizationId };
  }

  return { error: NextResponse.json({ error: "Invalid or missing credentials" }, { status: 401 }) };
}

async function suspended(organizationId: string): Promise<boolean> {
  const { OrgService } = await import("@/domains/organizations/service");
  return OrgService.isSuspended(organizationId);
}

function suspendedResponse() {
  return NextResponse.json({ error: "This workspace has been suspended. Contact support." }, { status: 403 });
}
