import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/apiAuth";
import { CustomStatusSchemaService } from "@/domains/leads/customStatusSchemaService";

// The org's lead-status schema — used by the app's status picker.
export async function GET(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if ("error" in auth) return auth.error;

  const schema = await CustomStatusSchemaService.getTenantStatusSchema(auth.organizationId);
  return NextResponse.json({ data: schema });
}
