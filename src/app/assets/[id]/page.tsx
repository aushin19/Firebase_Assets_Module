
import { mockAssets } from "@/data/mock-assets";
import type { Asset, AssetStatus, AssetType } from "@/types"; 
import { AssetDetailTabs } from "@/components/assets/asset-detail-tabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Layers, MapPin, Tag } from "lucide-react";
import Image from "next/image";
import { AssetIcon } from "@/components/asset-icon";
import { Badge } from "@/components/ui/badge";
import { statusVariantMap } from "@/components/assets/asset-data-table"; 

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

  const assetTypeForIcon = asset.hardware?.type as AssetType || 'Other';
  const assetStatusForBadge = asset.stage as AssetStatus || 'Unknown';

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
          <p className="text-sm text-muted-foreground mb-3">Device ID: {asset.deviceId} <span className="text-xs text-muted-foreground/70">({asset.deviceRef})</span></p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={statusVariantMap[assetStatusForBadge] || "secondary"} className="text-sm px-3 py-1 capitalize">{assetStatusForBadge}</Badge>
            {asset.hardware?.type && <Badge variant="outline" className="text-sm px-3 py-1"><AssetIcon type={asset.hardware.type as AssetType} className="mr-1.5 h-3.5 w-3.5 inline-block" />{asset.hardware.type}</Badge>}
            {asset.hardware?.category && <Badge variant="outline" className="text-sm px-3 py-1"><Layers className="mr-1.5 h-3.5 w-3.5 inline-block" />{asset.hardware.category}</Badge>}
            {asset.context?.location?.name && <Badge variant="outline" className="text-sm px-3 py-1"><MapPin className="mr-1.5 h-3.5 w-3.5 inline-block" />{asset.context.location.name}</Badge>}
            {asset.zone && <Badge variant="outline" className="text-sm px-3 py-1">Zone: {asset.zone}</Badge>}
            {asset.tags && asset.tags.slice(0, 2).map(tag => ( // Show first 2 tags
              <Badge key={tag} variant="outline" className="text-sm px-3 py-1"><Tag className="mr-1.5 h-3.5 w-3.5 inline-block" />{tag}</Badge>
            ))}
          </div>
          {asset.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{asset.description}</p>}
        </div>
      </div>

      <AssetDetailTabs asset={asset} />
    </div>
  );
}
