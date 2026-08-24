import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { LeadService } from "@/domains/leads/service";
import { QuickAddLeadDrawer } from "@/components/leads/QuickAddLeadDrawer";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
          <QuickAddLeadDrawer>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          </QuickAddLeadDrawer>
        </div>
      </div>
      
      {leads.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No leads found"
          description="Get started by creating a new lead manually or importing from a CSV."
          action={<Button variant="outline">Import CSV</Button>}
        />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email || "-"}</TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell>{lead.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/leads/${lead.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
