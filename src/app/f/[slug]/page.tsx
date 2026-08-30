import { notFound } from "next/navigation";
import { LeadSourceService } from "@/domains/leads/sourceService";
import { PublicLeadForm } from "@/components/PublicLeadForm";

// Public hosted lead-capture form. `slug` is the lead source id. Embeddable via an <iframe>.
export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const source = await LeadSourceService.getSource(slug);
  if (!source || !source.isActive || !source.organizationId) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <PublicLeadForm sourceId={slug} title={source.name || "Get in touch"} />
      </div>
    </div>
  );
}
