
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";

export default function AssetDetailLoading() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Skeleton className="h-9 w-36 flex items-center px-3 py-2 rounded-md">
          <ChevronLeft className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Back to Assets</span>
        </Skeleton>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="md:w-1/3 lg:w-1/4">
          <Skeleton className="rounded-lg shadow-md aspect-video object-cover w-full" />
        </div>
        <div className="md:w-2/3 lg:w-3/4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
          <Skeleton className="h-5 w-1/2" />
          <div className="flex flex-wrap gap-2 mb-4">
            {Array(4).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      </div>

      {/* Skeleton for AssetDetailTabs */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <nav className="w-full md:w-64 lg:w-72">
          <div className="flex flex-col space-y-1 p-1">
            {Array(8).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </nav>
        <div className="flex-1 min-w-0">
          <Skeleton className="h-[500px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
