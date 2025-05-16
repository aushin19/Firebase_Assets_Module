import { mockAssets } from "@/data/mock-assets";
import type { Asset } from "@/types";
import { AssetDetailTabs } from "@/components/assets/asset-detail-tabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { AssetIcon } from "@/components/asset-icon";
import { Badge } from "@/components/ui/badge";
import { statusVariantMap } from "@/components/assets/asset-data-table"; // Re-use status variant mapping

// This would typically be a server component fetching data
async function getAssetById(id: string): Promise<Asset | undefined> {
  // Simulate API call
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockAssets.find((asset) => asset.id === id)), 200)
  );
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const asset = await getAssetById(params.id);

  if (!asset) {
    notFound();
  }

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
            <AssetIcon type={asset.assetType} className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{asset.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-3">ID: {asset.id}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={statusVariantMap[asset.status] || "secondary"} className="text-sm px-3 py-1">{asset.status}</Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">{asset.assetType}</Badge>
            {asset.department && <Badge variant="outline" className="text-sm px-3 py-1">{asset.department}</Badge>}
          </div>
          {asset.notes && <p className="text-sm text-muted-foreground mb-2">{asset.notes}</p>}
        </div>
      </div>

      <AssetDetailTabs asset={asset} />
    </div>
  );
}
