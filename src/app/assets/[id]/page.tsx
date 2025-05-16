
import { mockAssets } from "@/data/mock-assets";
import type { Asset, AssetStatus, AssetType } from "@/types"; 
import { AssetDetailTabs } from "@/components/assets/asset-detail-tabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { AssetIcon } from "@/components/asset-icon";
import { Badge } from "@/components/ui/badge";
import { statusVariantMap } from "@/components/assets/asset-data-table"; // statusVariantMap is now exported

// This would typically be a server component fetching data
async function getAssetById(id: string): Promise<Asset | undefined> {
  // Simulate API call
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockAssets.find((asset) => asset.deviceId === id)), 200)
  );
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const asset = await getAssetById(params.id);

  if (!asset) {
    notFound();
  }

  // Use new schema fields
  const assetTypeForIcon = asset.hardware?.type as AssetType || 'Other'; // from hardware.type
  const assetStatusForBadge = asset.stage as AssetStatus || 'Unknown'; // from stage

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

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="md:w-1/3 lg:w-1/4">
          <Image
            src={asset.imageUrl || "https://placehold.co/600x400.png"}
            alt={asset.name}
            width={600}
            height={400}
            className="rounded-lg shadow-md aspect-video object-cover w-full"
            data-ai-hint="asset device"
          />
        </div>
        <div className="md:w-2/3 lg:w-3/4">
          <div className="flex items-center gap-2 mb-1">
            <AssetIcon type={assetTypeForIcon} className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{asset.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Device ID: {asset.deviceId}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={statusVariantMap[assetStatusForBadge] || "secondary"} className="text-sm px-3 py-1">{assetStatusForBadge}</Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">{asset.hardware?.type}</Badge> {/* Display hardware.type */}
            {asset.hardware?.category && <Badge variant="outline" className="text-sm px-3 py-1">{asset.hardware.category}</Badge>}
            {asset.context?.location?.name && <Badge variant="outline" className="text-sm px-3 py-1">Loc: {asset.context.location.name}</Badge>}
            {/* Department is a legacy field, might not be in asset.context or similar new structure */}
            {asset.department && <Badge variant="outline" className="text-sm px-3 py-1">{asset.department}</Badge>} 
          </div>
          {asset.description && <p className="text-sm text-muted-foreground mb-2">{asset.description}</p>}
        </div>
      </div>

      <AssetDetailTabs asset={asset} />
    </div>
  );
}
