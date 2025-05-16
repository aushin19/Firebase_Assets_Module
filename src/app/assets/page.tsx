import { Button } from "@/components/ui/button";
import { AssetDataTable } from "@/components/assets/asset-data-table";
import { mockAssets } from "@/data/mock-assets";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import type { Asset } from "@/types";

// This would typically be a server component fetching data
async function getAssets(): Promise<Asset[]> {
  // Simulate API call
  return new Promise((resolve) => setTimeout(() => resolve(mockAssets), 500));
}

export default async function AssetsPage() {
  const assets = await getAssets();

  return (
    <div className="container mx-auto py-2 sm:py-4 lg:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Asset Inventory</h1>
          <p className="text-muted-foreground">Manage and track all your company assets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Bulk Export
          </Button>
        </div>
      </div>
      <AssetDataTable assets={assets} />
    </div>
  );
}
