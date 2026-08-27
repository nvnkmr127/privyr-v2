"use server";

import { z } from "zod";
import { OrgService } from "@/domains/organizations/service";

const signupSchema = z.object({
  orgName: z.string().min(1, "Workspace name is required").max(255),
  firstName: z.string().max(255).optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Public — no auth. Creates a new tenant and its owner.
export async function signupAction(input: z.infer<typeof signupSchema>) {
  const data = signupSchema.parse(input);
  await OrgService.createWithOwner({
    orgName: data.orgName,
    email: data.email,
    password: data.password,
    firstName: data.firstName,
  });
  return { ok: true };
}
