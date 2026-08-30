"use server";

import { z } from "zod";
import { OrgService } from "@/domains/organizations/service";
import { ok, fail, actionFail, zodFieldErrors } from "@/lib/actions/result";

const signupSchema = z.object({
  orgName: z.string().min(1, "Workspace name is required").max(255),
  firstName: z.string().max(255).optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Public — no auth. Creates a new tenant and its owner.
export async function signupAction(input: z.infer<typeof signupSchema>) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Please check the highlighted fields and try again.", zodFieldErrors(parsed.error));
  }
  const data = parsed.data;
  try {
    await OrgService.createWithOwner({
      orgName: data.orgName,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
    });
    return ok({ created: true });
  } catch (e: any) {
    if (String(e?.message || e).includes("duplicate") || e?.code === "23505") {
      return fail("CONFLICT", "An account with that email already exists. Try signing in instead.", { email: "This email is already registered." });
    }
    return actionFail(e);
  }
}
