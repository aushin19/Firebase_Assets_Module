
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, FileSpreadsheet, Search, ChevronDown } from "lucide-react";

export default function AssetsLoading() {
  return (
    <div className="container mx-auto py-2 sm:py-4 lg:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 flex items-center justify-center px-4 py-2 rounded-md">
            <UploadCloud className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Bulk Import</span>
          </Skeleton>
          <Skeleton className="h-10 w-36 flex items-center justify-center px-4 py-2 rounded-md">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Bulk Export</span>
          </Skeleton>
        </div>
      </div>

      {/* Skeleton for AssetDataTable */}
      <div className="w-full">
        <div className="flex items-center py-4 gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-10 w-full pl-10 rounded-md" />
          </div>
          <Skeleton className="h-10 w-32 ml-auto flex items-center justify-center px-4 py-2 rounded-md">
             <span className="text-muted-foreground">Columns</span>
            <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
          </Skeleton>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array(5).fill(null).map((_, index) => (
                  <TableHead key={index}><Skeleton className="h-5 w-24" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(null).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
