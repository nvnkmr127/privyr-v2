import { BookingService } from "@/domains/booking/service";
import { BookingForm } from "@/components/booking/BookingForm";
import { notFound } from "next/navigation";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await BookingService.getOrgBySlug(slug);
  if (!org) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted">
      <div className="w-full max-w-md border rounded-xl bg-card shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Book a meeting with {org.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick a time and we'll get back to you to confirm.</p>
        </div>
        <BookingForm slug={slug} />
      </div>
    </div>
  );
}
