
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Asset, AssetSoftware } from "@/types";
import { SecurityMitigationsTab } from "./security-mitigations-tab";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, HardDrive, Users, ListChecks, ShieldAlert, CalendarDays, Tag, MapPin, Binary, DollarSign, Layers, Network as NetworkIcon, Info, AlertTriangle, ClipboardCheck, Thermometer, GanttChartSquare, UserCheck, History, Settings2, Brain 
} from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';

interface AssetDetailTabsProps {
  asset: Asset;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
       if (dateString instanceof Date && isValid(dateString)) {
         return format(dateString, 'MM/dd/yyyy');
       }
      return 'N/A (Invalid Date)';
    }
    return format(date, 'MM/dd/yyyy');
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'N/A (Format Error)';
  }
};

const DetailItem: React.FC<{ label: string; value?: string | number | null | React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (value === undefined || value === null || value === "" || (typeof value === 'object' && !React.isValidElement(value) && Object.keys(value).length === 0)) return null;
  return (
    <div className="flex items-start py-2">
      {icon && <div className="mr-3 mt-1 text-muted-foreground">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="text-base text-foreground">{String(value)}</p>
        ) : (
          <div className="text-base text-foreground">{value}</div>
        )}
      </div>
    </div>
  );
};

const SoftwareListItem: React.FC<{ software: AssetSoftware }> = ({ software }) => (
  <li className="py-2 border-b border-border last:border-b-0">
    <div className="flex justify-between items-center">
      <div>
        <p className="font-semibold text-foreground">{software.name} ({software.version})</p>
        <p className="text-sm text-muted-foreground">Vendor: {software.vendor || 'N/A'}</p>
      </div>
      {software.patchLevel && <p className="text-sm text-muted-foreground">Patch: {software.patchLevel}</p>}
    </div>
    {software.installDate && <p className="text-xs text-muted-foreground mt-1">Installed: {formatDate(software.installDate)}</p>}
     {software.ref && <p className="text-xs text-muted-foreground mt-1">Ref: {software.ref}</p>}
  </li>
);

const navigationItems = [
  { value: "overview", label: "Overview", icon: <FileText className="mr-2 h-4 w-4" /> },
  { value: "hardware", label: "Hardware", icon: <HardDrive className="mr-2 h-4 w-4" /> },
  { value: "context", label: "Context & Location", icon: <Layers className="mr-2 h-4 w-4" /> },
  { value: "connections", label: "Connections", icon: <NetworkIcon className="mr-2 h-4 w-4" /> },
  { value: "software", label: "Software", icon: <ListChecks className="mr-2 h-4 w-4" /> },
  { value: "lifecycle", label: "Lifecycle & Assignment", icon: <GanttChartSquare className="mr-2 h-4 w-4" /> },
  { value: "security", label: "Security & Compliance", icon: <ShieldAlert className="mr-2 h-4 w-4" /> },
  { value: "maintenance", label: "Maintenance", icon: <Settings2 className="mr-2 h-4 w-4" /> },
  { value: "monitoring", label: "Monitoring & Behavior", icon: <Brain className="mr-2 h-4 w-4" /> },
];

export function AssetDetailTabs({ asset }: AssetDetailTabsProps) {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      <nav className="w-full md:w-64 lg:w-72">
        <ScrollArea className="h-auto md:h-[calc(100vh-10rem)] md:pr-4"> {/* Adjust height as needed */}
          <div className="flex flex-col space-y-1">
            {navigationItems.map((item) => (
              <Button
                key={item.value}
                variant={activeSection === item.value ? "secondary" : "ghost"}
                className="w-full justify-start text-sm"
                onClick={() => setActiveSection(item.value)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </nav>

      <div className="flex-1 min-w-0">
        {activeSection === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>Asset Overview</CardTitle>
              <CardDescription>General information about {asset.name}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <DetailItem label="Device ID" value={asset.deviceId} icon={<Tag className="h-4 w-4"/>} />
              <DetailItem label="Device Ref" value={asset.deviceRef} icon={<Tag className="h-4 w-4"/>} />
              <DetailItem label="Description" value={asset.description} icon={<FileText className="h-4 w-4"/>} />
              <DetailItem label="Documentation" value={asset.documentation ? <a href={asset.documentation} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{asset.documentation}</a> : 'N/A'} icon={<FileText className="h-4 w-4"/>} />
              <DetailItem label="Serial Number" value={asset.serialNumber} icon={<Binary className="h-4 w-4" />} />
              <DetailItem label="Hosted On" value={asset.hostedOn} icon={<HardDrive className="h-4 w-4" />} />
              <DetailItem label="Zone" value={asset.zone} icon={<MapPin className="h-4 w-4" />} />
              <DetailItem label="Release Version" value={asset.release} icon={<Info className="h-4 w-4" />} />
              <DetailItem label="Criticality Rating" value={asset.criticality?.rating} icon={<AlertTriangle className="h-4 w-4" />} />
              <DetailItem label="Business Criticality" value={asset.criticality?.businessCriticality} icon={<AlertTriangle className="h-4 w-4" />} />
              <DetailItem label="Impact Score" value={asset.criticality?.impact} icon={<AlertTriangle className="h-4 w-4" />} />
              <DetailItem label="Network Exposure" value={asset.exposure} icon={<NetworkIcon className="h-4 w-4" />} />
              <DetailItem label="Safety Certification" value={asset.safety?.certification} icon={<ClipboardCheck className="h-4 w-4" />} />
              <DetailItem label="Safety Level" value={asset.safety?.level} icon={<ClipboardCheck className="h-4 w-4" />} />
              <DetailItem label="Last Safety Assessment" value={formatDate(asset.safety?.lastAssessment)} icon={<CalendarDays className="h-4 w-4" />} />
               {asset.tags && asset.tags.length > 0 && (
                <DetailItem label="Tags" value={asset.tags.join(', ')} icon={<Tag className="h-4 w-4" />} />
              )}
              <DetailItem label="Purchase Cost (Legacy)" value={asset.purchaseCost ? `$${asset.purchaseCost.toFixed(2)}` : 'N/A'} icon={<DollarSign className="h-4 w-4" />} />
              <DetailItem label="Current Value (Legacy)" value={asset.currentValue ? `$${asset.currentValue.toFixed(2)}` : 'N/A'} icon={<DollarSign className="h-4 w-4" />} />
              <DetailItem label="OS/Firmware (Legacy/Simplified)" value={asset.os_firmware} icon={<Layers className="h-4 w-4" />} />

              {asset.extended && Object.keys(asset.extended).length > 0 && (
                <div className="md:col-span-2 pt-4 mt-4 border-t">
                  <h4 className="text-md font-semibold mb-2 text-foreground">Extended Properties:</h4>
                  {Object.entries(asset.extended).map(([key, value]) => (
                    <DetailItem key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={String(value)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "hardware" && (
          <Card>
            <CardHeader>
              <CardTitle>Hardware Details</CardTitle>
              <CardDescription>Information about the physical hardware components.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <DetailItem label="Vendor" value={asset.hardware?.vendor} icon={<Tag className="h-4 w-4" />} />
              <DetailItem label="Model" value={asset.hardware?.model} icon={<Tag className="h-4 w-4" />} />
              <DetailItem label="Type" value={asset.hardware?.type} icon={<HardDrive className="h-4 w-4" />} />
              <DetailItem label="Category" value={asset.hardware?.category} icon={<Layers className="h-4 w-4" />} />
              <DetailItem label="Hardware Version" value={asset.hardware?.version} icon={<Info className="h-4 w-4" />} />
              <DetailItem label="Order Number" value={asset.hardware?.orderNumber} icon={<Binary className="h-4 w-4" />} />
              <DetailItem label="Vendor Link" value={asset.hardware?.vendorLink ? <a href={asset.hardware.vendorLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{asset.hardware.vendorLink}</a> : 'N/A'} icon={<FileText className="h-4 w-4" />} />
              <DetailItem label="Hardware Description" value={asset.hardware?.description} icon={<FileText className="h-4 w-4" />} />
              <DetailItem label="End of Life" value={formatDate(asset.hardware?.endOfLife)} icon={<CalendarDays className="h-4 w-4" />} />
              {asset.hardware?.extended && (
                  <>
                      {Object.entries(asset.hardware.extended).map(([key, value]) => (
                          <DetailItem key={key} label={`Ext: ${key}`} value={String(value)} icon={<Info className="h-4 w-4" />}/>
                      ))}
                  </>
              )}
              <DetailItem label="CPU (Legacy)" value={asset.cpu} icon={<HardDrive className="h-4 w-4" />} />
              <DetailItem label="RAM (Legacy)" value={asset.ram} icon={<HardDrive className="h-4 w-4" />} />
              <DetailItem label="Storage (Legacy)" value={asset.storage} icon={<HardDrive className="h-4 w-4" />} />
            </CardContent>
          </Card>
        )}

        {activeSection === "context" && (
           <Card>
            <CardHeader>
              <CardTitle>Contextual Information</CardTitle>
              <CardDescription>Location, system, and business process associations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset.context?.location && (
                  <div>
                      <h4 className="text-md font-semibold mb-1 text-foreground">Primary Location</h4>
                      <DetailItem label="Name" value={asset.context.location.name} icon={<MapPin className="h-4 w-4" />} />
                      <DetailItem label="Location ID" value={asset.context.location.locationId} />
                      <DetailItem label="Ref" value={asset.context.location.ref} />
                  </div>
              )}
              {asset.context?.referenceLocation && (
                  <div className="pt-2 border-t">
                      <h4 className="text-md font-semibold mb-1 text-foreground">Reference Location</h4>
                      <DetailItem label="Name" value={asset.context.referenceLocation.name} icon={<MapPin className="h-4 w-4" />} />
                      <DetailItem label="Location ID" value={asset.context.referenceLocation.locationId} />
                      <DetailItem label="Ref" value={asset.context.referenceLocation.ref} />
                  </div>
              )}
               {asset.context?.otSystem && (
                  <div className="pt-2 border-t">
                      <h4 className="text-md font-semibold mb-1 text-foreground">OT System</h4>
                      <DetailItem label="Name" value={asset.context.otSystem.name} icon={<Layers className="h-4 w-4" />} />
                      <DetailItem label="ID" value={asset.context.otSystem.id} />
                  </div>
              )}
              <DetailItem label="Device Group" value={asset.context?.deviceGroup} icon={<Users className="h-4 w-4" />} />
              {asset.context?.businessProcesses && asset.context.businessProcesses.length > 0 && (
                   <div className="pt-2 border-t">
                      <h4 className="text-md font-semibold mb-1 text-foreground">Business Processes</h4>
                      <ul className="space-y-1">
                      {asset.context.businessProcesses.map((bp, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                             {bp.name} (Role: {bp.role || 'N/A'}, Criticality: {bp.criticality || 'N/A'}, Ref: {bp.ref || 'N/A'})
                          </li>
                      ))}
                      </ul>
                  </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {activeSection === "connections" && (
          <Card>
            <CardHeader>
              <CardTitle>Network Connections</CardTitle>
              <CardDescription>Details about network interfaces and connections.</CardDescription>
            </CardHeader>
            <CardContent>
              {asset.connections && asset.connections.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-6">
                    {asset.connections.map((conn, index) => (
                      <div key={index} className="p-4 border rounded-md">
                        <h4 className="text-md font-semibold mb-2 text-foreground">Connection {index + 1} (IF: {conn.ifName || 'N/A'})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                          <DetailItem label="Network Name" value={conn.network} />
                          <DetailItem label="Network ID" value={conn.networkId} />
                          <DetailItem label="Network Group" value={conn.networkGroup} />
                          <DetailItem label="Medium" value={conn.medium} />
                          <DetailItem label="L2 Address (MAC)" value={conn.L2Address} />
                          <DetailItem label="L3 Address (IP)" value={conn.L3Address} />
                          <DetailItem label="Network Address" value={conn.networkAddress} />
                          <DetailItem label="Network Type" value={conn.networkType} />
                          <DetailItem label="Port" value={conn.port} />
                          <DetailItem label="VLAN" value={conn.vlan} />
                          <DetailItem label="Interface Status" value={conn.ifStatus} />
                          <DetailItem label="DHCP" value={conn.ifDHCP} />
                          <DetailItem label="Speed" value={conn.speed} />
                          <DetailItem label="Duplex" value={conn.duplex} />
                          <DetailItem label="Counterpart" value={conn.counterpart} />
                          <DetailItem label="Remote Port" value={conn.remotePort} />
                           <DetailItem label="Network Ref" value={conn.networkRef} />
                          {conn.networkLocation && (
                              <div className="md:col-span-2 mt-1">
                                  <p className="text-xs font-medium text-muted-foreground">Network Location: {conn.networkLocation.name} (ID: {conn.networkLocation.locationId}, Ref: {conn.networkLocation.ref})</p>
                              </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground">No network connection information available.</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "software" && (
          <Card>
            <CardHeader>
              <CardTitle>Installed Software & Firmware</CardTitle>
              <CardDescription>List of software and firmware on {asset.name}. OS/Firmware: {asset.os_firmware || "N/A"}</CardDescription>
            </CardHeader>
            <CardContent>
              {asset.software && asset.software.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <ul className="divide-y divide-border">
                    {asset.software.map((sw, index) => (
                      <SoftwareListItem key={sw.ref || index} software={sw} />
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground">No detailed software information available.</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "lifecycle" && (
          <Card>
            <CardHeader>
              <CardTitle>Lifecycle & Assignment</CardTitle>
              <CardDescription>Installation, warranty, lifecycle stage, and user assignment.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <DetailItem label="Installation Date" value={formatDate(asset.installationDate)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Manufacture Date" value={formatDate(asset.manufactureDate)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Current Stage" value={asset.stage} icon={<GanttChartSquare className="h-4 w-4" />} />
              <DetailItem label="Product Lifecycle" value={asset.lifecycle} icon={<History className="h-4 w-4" />} />
              <DetailItem label="Last Seen" value={formatDate(asset.last_seen)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Config Last Modified" value={formatDate(asset.modified)} icon={<CalendarDays className="h-4 w-4" />} />
              
              {asset.warranty && (
                  <>
                      <DetailItem label="Warranty Start Date" value={formatDate(asset.warranty.startDate)} icon={<CalendarDays className="h-4 w-4" />} />
                      <DetailItem label="Warranty End Date" value={formatDate(asset.warranty.endDate)} icon={<CalendarDays className="h-4 w-4" />} />
                      <DetailItem label="Warranty Provider" value={asset.warranty.provider} icon={<UserCheck className="h-4 w-4" />} />
                      <DetailItem label="Warranty Terms" value={asset.warranty.terms} icon={<FileText className="h-4 w-4" />} />
                  </>
              )}
              <DetailItem label="Retirement Date (Legacy)" value={formatDate(asset.retirementDate)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Assigned User (Legacy)" value={asset.assignedUser} icon={<Users className="h-4 w-4" />} />
              <DetailItem label="Department (Legacy)" value={asset.department} icon={<Users className="h-4 w-4" />} />
            </CardContent>
          </Card>
        )}

        {activeSection === "security" && (
          <>
            <SecurityMitigationsTab asset={asset} />
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Additional Security & Compliance Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Authentication Method" value={asset.security?.authenticationMethod} icon={<ShieldAlert className="h-4 w-4"/>} />
                    <DetailItem label="Encryption Enabled" value={asset.security?.encryptionEnabled ? 'Yes' : 'No'} icon={<ShieldAlert className="h-4 w-4"/>} />
                    <DetailItem label="Last Security Assessment" value={formatDate(asset.security?.lastSecurityAssessment)} icon={<CalendarDays className="h-4 w-4"/>} />
                    <DetailItem label="Security Score" value={asset.security?.securityScore} icon={<Thermometer className="h-4 w-4"/>} />
                    {/* TODO: List vulnerabilities, security controls, compliance frameworks from asset.security and asset.compliance */}
                    {asset.security?.vulnerabilities && asset.security.vulnerabilities.length > 0 && (
                      <div className="md:col-span-2 pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold mb-2 text-foreground">Vulnerabilities ({asset.security.vulnerabilities.length}):</h4>
                        <ScrollArea className="h-[150px]">
                          <ul className="space-y-2">
                            {asset.security.vulnerabilities.map((vuln, idx) => (
                              <li key={idx} className="text-sm p-2 border rounded-md">
                                <p><strong>Ref:</strong> {vuln.ref || 'N/A'}</p>
                                <p><strong>Status:</strong> {vuln.status || 'Unknown'}</p>
                                <p><strong>Discovered:</strong> {formatDate(vuln.discoveryDate)}</p>
                                {vuln.mitigationDate && <p><strong>Mitigated:</strong> {formatDate(vuln.mitigationDate)} ({vuln.mitigationMethod || 'N/A'})</p>}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}
                    {asset.compliance?.frameworks && asset.compliance.frameworks.length > 0 && (
                       <div className="md:col-span-2 pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold mb-2 text-foreground">Compliance Frameworks:</h4>
                         <ul className="space-y-1">
                            {asset.compliance.frameworks.map((fw, idx) => (
                              <li key={idx} className="text-sm">
                                {fw.ref || 'N/A Framework'}: {fw.status || 'Unknown Status'} (Last Assessed: {formatDate(fw.lastAssessment)}, Findings: {fw.findings ?? 'N/A'})
                              </li>
                            ))}
                          </ul>
                       </div>
                    )}
                </CardContent>
            </Card>
          </>
        )}

        {activeSection === "maintenance" && (
          <Card>
              <CardHeader>
                  <CardTitle>Maintenance Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <DetailItem label="Maintenance Frequency" value={asset.maintenance?.schedule?.frequency} icon={<Settings2 className="h-4 w-4"/>} />
                  <DetailItem label="Next Scheduled Maintenance" value={formatDate(asset.maintenance?.schedule?.nextScheduled)} icon={<CalendarDays className="h-4 w-4"/>} />
                  <DetailItem label="Last Performed Maintenance" value={formatDate(asset.maintenance?.schedule?.lastPerformed)} icon={<CalendarDays className="h-4 w-4"/>} />
                  <DetailItem label="Maintenance Records Count" value={asset.maintenance?.records?.length} icon={<ListChecks className="h-4 w-4"/>} />
                  {/* TODO: List maintenance records if available */}
              </CardContent>
          </Card>
        )}

        {activeSection === "monitoring" && (
          <Card>
              <CardHeader>
                  <CardTitle>Monitoring & Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                   <DetailItem label="Last Seen By (Discovery Node)" value={asset.last_seen_by} icon={<Brain className="h-4 w-4"/>} />
                   <DetailItem label="Last Patch Date" value={formatDate(asset.last_patch_date)} icon={<CalendarDays className="h-4 w-4"/>} />
                   <DetailItem label="Days Since Last Patch" value={asset.days_since_last_patch} icon={<History className="h-4 w-4"/>} />
                   {/* TODO: Display monitors array, behavior patterns, anomaly detection */}
                   {asset.monitors && asset.monitors.length > 0 && (
                    <div className="pt-4 mt-4 border-t">
                      <h4 className="text-md font-semibold mb-2 text-foreground">Monitors ({asset.monitors.length}):</h4>
                      <ScrollArea className="h-[150px]">
                        <ul className="space-y-2">
                          {asset.monitors.map((monitor, idx) => (
                            <li key={idx} className="text-sm p-2 border rounded-md">
                              <p><strong>Node:</strong> {monitor.monitor_name || 'N/A'}</p>
                              <p><strong>Last Scan:</strong> {formatDate(monitor.last_scan)}</p>
                              <p><strong>Last Seen by Node:</strong> {formatDate(monitor.last_seen)}</p>
                              <p><strong>Result:</strong> {monitor.last_result || 'N/A'}</p>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                   )}
                   {asset.behavior?.normalPatterns && asset.behavior.normalPatterns.length > 0 && (
                    <div className="pt-4 mt-4 border-t">
                      <h4 className="text-md font-semibold mb-2 text-foreground">Normal Behavior Patterns:</h4>
                       <ul className="space-y-1">
                          {asset.behavior.normalPatterns.map((pattern, idx) => (
                            <li key={idx} className="text-sm">
                              <strong>{pattern.type || 'Pattern'}:</strong> {pattern.description || 'N/A'}
                            </li>
                          ))}
                        </ul>
                     </div>
                   )}
                   {asset.behavior?.anomalyDetection && (
                      <div className="pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold mb-2 text-foreground">Anomaly Detection:</h4>
                        <DetailItem label="Enabled" value={asset.behavior.anomalyDetection.enabled ? 'Yes' : 'No'} />
                        <DetailItem label="Sensitivity" value={asset.behavior.anomalyDetection.sensitivity} />
                        <DetailItem label="Last Anomaly" value={formatDate(asset.behavior.anomalyDetection.lastAnomaly)} />
                      </div>
                   )}
              </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
