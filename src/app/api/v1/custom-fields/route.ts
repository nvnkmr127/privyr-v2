import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { CustomFieldService } from "@/domains/customFields/service";

// The org's custom-field definitions, so mobile can render typed inputs for a lead's customData.
export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ data: await CustomFieldService.list(auth.organizationId) });
}
