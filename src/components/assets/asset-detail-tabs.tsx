"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Asset, Software } from "@/types";
import { SecurityMitigationsTab } from "./security-mitigations-tab";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, HardDrive, Users, ListChecks, ShieldAlert, CalendarDays, Tag, MapPin, Binary, DollarSign } from "lucide-react";

interface AssetDetailTabsProps {
  asset: Asset;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start py-2">
      {icon && <div className="mr-3 mt-1 text-muted-foreground">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base text-foreground">{String(value)}</p>
      </div>
    </div>
  );
};

const SoftwareListItem: React.FC<{ software: Software }> = ({ software }) => (
  <li className="py-2 border-b border-border last:border-b-0">
    <div className="flex justify-between items-center">
      <div>
        <p className="font-semibold text-foreground">{software.name}</p>
        <p className="text-sm text-muted-foreground">Version: {software.version}</p>
      </div>
      {software.vendor && <p className="text-sm text-muted-foreground">{software.vendor}</p>}
    </div>
    {software.installDate && <p className="text-xs text-muted-foreground mt-1">Installed: {new Date(software.installDate).toLocaleDateString()}</p>}
  </li>
);

export function AssetDetailTabs({ asset }: AssetDetailTabsProps) {
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
        <TabsTrigger value="overview"><FileText className="mr-2 h-4 w-4" />Overview</TabsTrigger>
        <TabsTrigger value="specifications"><HardDrive className="mr-2 h-4 w-4" />Specifications</TabsTrigger>
        <TabsTrigger value="assignment"><Users className="mr-2 h-4 w-4" />Assignment & Lifecycle</TabsTrigger>
        <TabsTrigger value="software"><ListChecks className="mr-2 h-4 w-4" />Software</TabsTrigger>
        <TabsTrigger value="security"><ShieldAlert className="mr-2 h-4 w-4" />Security</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Asset Overview</CardTitle>
            <CardDescription>General information about {asset.name}.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem label="Manufacturer" value={asset.manufacturer} icon={<Tag className="h-4 w-4" />} />
            <DetailItem label="Model" value={asset.model} icon={<Tag className="h-4 w-4" />} />
            <DetailItem label="Serial Number" value={asset.serialNumber} icon={<Binary className="h-4 w-4" />} />
            <DetailItem label="Location" value={asset.location} icon={<MapPin className="h-4 w-4" />} />
            <DetailItem label="Purchase Date" value={formatDate(asset.purchaseDate)} icon={<CalendarDays className="h-4 w-4" />} />
            <DetailItem label="Warranty End Date" value={formatDate(asset.warrantyEndDate)} icon={<CalendarDays className="h-4 w-4" />} />
            <DetailItem label="Purchase Cost" value={asset.purchaseCost ? `$${asset.purchaseCost.toFixed(2)}` : 'N/A'} icon={<DollarSign className="h-4 w-4" />} />
            <DetailItem label="Current Value" value={asset.currentValue ? `$${asset.currentValue.toFixed(2)}` : 'N/A'} icon={<DollarSign className="h-4 w-4" />} />
            {asset.notes && (
               <div className="md:col-span-2">
                <DetailItem label="Notes" value={asset.notes} icon={<FileText className="h-4 w-4"/>} />
               </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="specifications">
        <Card>
          <CardHeader>
            <CardTitle>Technical Specifications</CardTitle>
            <CardDescription>Hardware and network details.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem label="Operating System" value={asset.operatingSystem} />
            <DetailItem label="CPU" value={asset.cpu} />
            <DetailItem label="RAM" value={asset.ram} />
            <DetailItem label="Storage" value={asset.storage} />
            <DetailItem label="IP Address" value={asset.ipAddress} />
            <DetailItem label="MAC Address" value={asset.macAddress} />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="assignment">
        <Card>
          <CardHeader>
            <CardTitle>Assignment & Lifecycle</CardTitle>
            <CardDescription>User assignment, department, and lifecycle dates.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem label="Assigned User" value={asset.assignedUser} icon={<Users className="h-4 w-4" />} />
            <DetailItem label="Department" value={asset.department} icon={<Users className="h-4 w-4" />} />
            <DetailItem label="Last Seen" value={formatDate(asset.lastSeen)} icon={<CalendarDays className="h-4 w-4" />} />
            <DetailItem label="Retirement Date" value={formatDate(asset.retirementDate)} icon={<CalendarDays className="h-4 w-4" />} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="software">
        <Card>
          <CardHeader>
            <CardTitle>Installed Software</CardTitle>
            <CardDescription>List of software installed on {asset.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            {asset.softwareList && asset.softwareList.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <ul className="divide-y divide-border">
                  {asset.softwareList.map((sw) => (
                    <SoftwareListItem key={sw.id} software={sw} />
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground">No software information available.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <SecurityMitigationsTab asset={asset} />
      </TabsContent>
    </Tabs>
  );
}
