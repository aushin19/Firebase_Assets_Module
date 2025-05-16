
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Search, Eye } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Asset, AssetStatus, AssetType } from "@/types"; 
import { AssetIcon } from "@/components/asset-icon";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";

export const statusVariantMap: Record<AssetStatus, "default" | "secondary" | "destructive" | "outline"> = {
  "Operational": "default", 
  "Active": "default", 
  "Online": "default",
  "In Use": "default",
  "Standby": "secondary",
  "Inactive": "secondary",
  "Offline": "secondary",
  "Not In Use": "secondary",
  "Maintenance": "outline",
  "In Repair": "outline",
  "Degraded": "outline", 
  "End of Life": "destructive",
  "Disposed": "destructive",
  "Retired": "destructive",
  "Missing": "destructive",
  "Planning": "secondary",
  "Commissioning": "secondary",
  "On Order": "secondary", 
  "Testing": "outline",
  "Active Support": "default",
  "Limited Support": "outline",
  "Unsupported": "destructive",
  "Unknown": "secondary", 
};


export const columns: ColumnDef<Asset>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Image 
          src={row.original.imageUrl || "https://placehold.co/40x40.png"} 
          alt={row.original.name}
          width={40}
          height={40}
          className="rounded-md object-cover aspect-square"
          data-ai-hint="asset device"
        />
        <div className="flex flex-col">
          <Link href={`/assets/${row.original.deviceId}`} className="font-medium hover:underline text-foreground">
            {row.getValue("name")}
          </Link>
          <span className="text-xs text-muted-foreground">{row.original.deviceId}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "hardware.type", 
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Type
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <AssetIcon type={row.original.hardware?.type as AssetType || 'Other'} className="h-4 w-4 text-muted-foreground" />
        <span>{row.original.hardware?.type || 'N/A'}</span>
      </div>
    ),
  },
  {
    accessorKey: "stage", 
    header: "Status", 
    cell: ({ row }) => {
      const stage = row.getValue("stage") as AssetStatus; 
      return <Badge variant={statusVariantMap[stage] || "secondary"}>{stage || 'Unknown'}</Badge>;
    }
  },
  {
    accessorKey: "assignedUser", 
    header: "Assigned User",
    cell: ({ row }) => row.original.assignedUser || <span className="text-muted-foreground italic">Unassigned</span>,
  },
  {
    accessorKey: "context.location.name", 
    header: "Location",
    cell: ({ row }) => row.original.context?.location?.name || <span className="text-muted-foreground italic">N/A</span>,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/assets/${row.original.deviceId}`}>
          <Eye className="mr-2 h-4 w-4" /> View
        </Link>
      </Button>
    ),
  },
];

interface AssetDataTableProps {
  assets: Asset[];
}

export function AssetDataTable({ assets }: AssetDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [columnVisibility, setColumnVisibility] = React.useState({})
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const table = useReactTable({
    data: assets,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
    getRowId: row => row.deviceId, 
  });

  if (!mounted) {
    // Basic skeleton loader
    return (
      <div className="w-full">
        <div className="flex items-center py-4 gap-2">
          <div className="relative w-full max-w-sm">
            <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
          </div>
          <div className="h-10 w-32 ml-auto bg-muted rounded-md animate-pulse" />
        </div>
        <div className="rounded-md border">
          <div className="h-12 bg-muted/50 rounded-t-md animate-pulse" />
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b">
              <div className="h-10 w-10 bg-muted rounded-md animate-pulse mr-3" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                let columnLabel = column.id;
                if (column.id === 'hardware.type') columnLabel = 'Type';
                else if (column.id === 'stage') columnLabel = 'Status';
                else if (column.id === 'context.location.name') columnLabel = 'Location';
                else if (column.id === 'assignedUser') columnLabel = 'Assigned User';

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {columnLabel}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  as={motion.tr}
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:bg-muted/60 hover:shadow-md transition-all"
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
