"use server";

import { BookingService } from "@/domains/booking/service";
import { RateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

// Public — no auth. The org slug in the URL is the only "credential"; it only lets a prospect
// create a lead + meeting request, nothing more.
const schema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  when: z.coerce.date(),
  message: z.string().trim().max(1000).optional(),
});

export async function requestMeetingAction(input: z.input<typeof schema>) {
  const data = schema.parse(input);
  if (!data.email && !data.phone) {
    throw new Error("Please provide at least an email or phone number.");
  }

  if (data.when.getTime() < Date.now() - 5 * 60 * 1000) {
    throw new Error("Please select a date and time in the future.");
  }

  const limit = await RateLimiter.checkLimit(`booking:${data.slug}`, 15, 60);
  if (!limit.success) {
    throw new Error("Too many booking requests. Please wait a moment and try again.");
  }

  await BookingService.request(data.slug, {
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    when: data.when,
    message: data.message,
  });

  return { ok: true };
}
