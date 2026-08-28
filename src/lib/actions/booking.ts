"use server";

import { BookingService } from "@/domains/booking/service";
import { z } from "zod";

// Public — no auth. The org slug in the URL is the only "credential"; it only lets a prospect
// create a lead + meeting request, nothing more.
const schema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1).max(255),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  when: z.coerce.date(),
  message: z.string().trim().max(1000).optional(),
});

export async function requestMeetingAction(input: z.input<typeof schema>) {
  const data = schema.parse(input);
  if (!data.email && !data.phone) throw new Error("Please provide an email or phone number");
  await BookingService.request(data.slug, {
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    when: data.when,
    message: data.message,
  });
  return { ok: true };
}
