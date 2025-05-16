import { BulkImportStepper } from "@/components/assets/bulk-import-stepper";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function BulkImportPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Link>
        </Button>
      </div>
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bulk Import Assets</h1>
        <p className="text-muted-foreground">Import multiple assets from a CSV file.</p>
      </div>
      <BulkImportStepper />
    </div>
  );
}
