import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Users, Plus, Upload } from "lucide-react";
import { LeadService } from "@/domains/leads/service";
import { QuickAddLeadDrawer } from "@/components/leads/QuickAddLeadDrawer";
import { ImportCsvDialog } from "@/components/leads/ImportCsvDialog";
import { LeadsFilterBar } from "@/components/leads/LeadsFilterBar";
import { LeadsTable } from "@/components/leads/LeadsTable";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;

  const { data: leads, total } = await LeadService.listLeads({ search, status });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
        <div className="flex items-center space-x-2">
          <ImportCsvDialog>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
          </ImportCsvDialog>
          <QuickAddLeadDrawer>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          </QuickAddLeadDrawer>
        </div>
      </div>
      
      {(total > 0 || search || status) && (
        <LeadsFilterBar search={search} status={status} />
      )}

      {leads.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No leads found"
          description="Get started by creating a new lead manually or importing from a CSV."
          action={
            <ImportCsvDialog>
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import CSV</Button>
            </ImportCsvDialog>
          }
        />
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}
