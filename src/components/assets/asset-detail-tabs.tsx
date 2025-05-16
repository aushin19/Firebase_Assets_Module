
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Asset, AssetSoftware, NetworkConnection, AssetVulnerability, MonitorInfo, BehaviorPattern, ComplianceFrameworkAssociation } from "@/types";
import { SecurityMitigationsTab } from "./security-mitigations-tab";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, HardDrive, Users, ListChecks, ShieldAlert, CalendarDays, Tag, MapPin, Binary, DollarSign, Layers, Network as NetworkIcon, Info, AlertTriangle, ClipboardCheck, Thermometer, GanttChartSquare, UserCheck, History, Settings2, Brain, Link as LinkIcon, Server, Eye, Activity, FileBadge, Users2 
} from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';

interface AssetDetailTabsProps {
  asset: Asset;
}

const formatDate = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  try {
    let date: Date;
    if (typeof dateString === 'string') {
      date = parseISO(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return 'N/A (Invalid Input)';
    }

    if (!isValid(date)) {
      return 'N/A (Invalid Date)';
    }
    return format(date, 'PPpp'); // Format: Jul 20, 2024, 2:30 PM
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'N/A (Format Error)';
  }
};

const DetailItem: React.FC<{ label: string; value?: string | number | boolean | null | React.ReactNode; icon?: React.ReactNode; fullWidth?: boolean }> = ({ label, value, icon, fullWidth }) => {
  if (value === undefined || value === null || value === "" || (typeof value === 'object' && !React.isValidElement(value) && Object.keys(value).length === 0)) return null;
  
  let displayValue: React.ReactNode;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    displayValue = <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{value}</a>;
  } else if (typeof value === 'string' || typeof value === 'number') {
    displayValue = String(value);
  } else {
    displayValue = value;
  }

  return (
    <div className={`flex items-start py-2 ${fullWidth ? 'md:col-span-2' : ''}`}>
      {icon && <div className="mr-3 mt-1 text-muted-foreground flex-shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {React.isValidElement(displayValue) ? (
          <div className="text-base text-foreground break-words">{displayValue}</div>
        ) : (
          <p className="text-base text-foreground break-words">{displayValue}</p>
        )}
      </div>
    </div>
  );
};

const SoftwareListItem: React.FC<{ software: AssetSoftware }> = ({ software }) => (
  <li className="py-3 border-b border-border last:border-b-0">
    <div className="flex justify-between items-start">
      <div>
        <p className="font-semibold text-foreground">{software.name} ({software.version})</p>
        <p className="text-sm text-muted-foreground">Vendor: {software.vendor || 'N/A'}</p>
      </div>
      <div className="text-right">
        {software.patchLevel && <p className="text-sm text-muted-foreground">Patch: {software.patchLevel}</p>}
        {software.ref && <p className="text-xs text-muted-foreground mt-0.5">Ref: {software.ref}</p>}
      </div>
    </div>
    {software.installDate && <p className="text-xs text-muted-foreground mt-1">Installed: {formatDate(software.installDate)}</p>}
  </li>
);

const navigationItems = [
  { value: "overview", label: "Overview", icon: <Eye className="mr-2 h-4 w-4" /> },
  { value: "hardware", label: "Hardware", icon: <HardDrive className="mr-2 h-4 w-4" /> },
  { value: "context", label: "Context & Location", icon: <Layers className="mr-2 h-4 w-4" /> },
  { value: "connections", label: "Connections", icon: <NetworkIcon className="mr-2 h-4 w-4" /> },
  { value: "software", label: "Software & OS", icon: <Binary className="mr-2 h-4 w-4" /> },
  { value: "lifecycle", label: "Lifecycle & Assignment", icon: <GanttChartSquare className="mr-2 h-4 w-4" /> },
  { value: "security", label: "Security & Compliance", icon: <ShieldAlert className="mr-2 h-4 w-4" /> },
  { value: "maintenance", label: "Maintenance", icon: <Settings2 className="mr-2 h-4 w-4" /> },
  { value: "monitoring", label: "Monitoring & Behavior", icon: <Activity className="mr-2 h-4 w-4" /> },
  { value: "risk", label: "Risk Assessment", icon: <AlertTriangle className="mr-2 h-4 w-4" /> },
  { value: "ai_mitigations", label: "AI Mitigations", icon: <Brain className="mr-2 h-4 w-4" /> },
];

export function AssetDetailTabs({ asset }: AssetDetailTabsProps) {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      <nav className="w-full md:w-64 lg:w-72">
        <ScrollArea className="h-auto md:h-[calc(100vh-12rem)] md:pr-4"> {/* Adjust height as needed */}
          <div className="flex flex-col space-y-1">
            {navigationItems.map((item) => (
              <Button
                key={item.value}
                variant={activeSection === item.value ? "secondary" : "ghost"}
                className="w-full justify-start text-sm h-10"
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <DetailItem label="Device ID" value={asset.deviceId} icon={<Tag className="h-4 w-4"/>} />
              <DetailItem label="Device Ref" value={asset.deviceRef} icon={<Tag className="h-4 w-4"/>} />
              <DetailItem label="Hosted On (Device ID)" value={asset.hostedOn} icon={<Server className="h-4 w-4" />} />
              <DetailItem label="Description" value={asset.description} icon={<FileText className="h-4 w-4"/>} fullWidth />
              <DetailItem label="Documentation" value={asset.documentation} icon={<LinkIcon className="h-4 w-4"/>} fullWidth />
              <DetailItem label="Serial Number" value={asset.serialNumber} icon={<Binary className="h-4 w-4" />} />
              <DetailItem label="Zone" value={asset.zone} icon={<MapPin className="h-4 w-4" />} />
              <DetailItem label="Release Version" value={asset.release} icon={<Info className="h-4 w-4" />} />
              <DetailItem label="Criticality Rating" value={asset.criticality?.rating} icon={<AlertTriangle className="h-4 w-4" />} />
              <DetailItem label="Business Criticality" value={asset.criticality?.businessCriticality} icon={<AlertTriangle className="h-4 w-4" />} />
              <DetailItem label="Impact Score" value={asset.criticality?.impact} icon={<AlertTriangle className="h-4 w-4" />} />
              <DetailItem label="Network Exposure" value={asset.exposure} icon={<NetworkIcon className="h-4 w-4" />} />
              <DetailItem label="Safety Certification" value={asset.safety?.certification} icon={<FileBadge className="h-4 w-4" />} />
              <DetailItem label="Safety Level (SIL)" value={asset.safety?.level} icon={<ClipboardCheck className="h-4 w-4" />} />
              <DetailItem label="Last Safety Assessment" value={formatDate(asset.safety?.lastAssessment)} icon={<CalendarDays className="h-4 w-4" />} />
               {asset.tags && asset.tags.length > 0 && (
                <DetailItem label="Tags" value={asset.tags.join(', ')} icon={<Tag className="h-4 w-4" />} fullWidth />
              )}
              <DetailItem label="Purchase Cost (Legacy)" value={asset.purchaseCost ? `$${asset.purchaseCost.toFixed(2)}` : 'N/A'} icon={<DollarSign className="h-4 w-4" />} />
              <DetailItem label="Current Value (Legacy)" value={asset.currentValue ? `$${asset.currentValue.toFixed(2)}` : 'N/A'} icon={<DollarSign className="h-4 w-4" />} />
              
              {asset.extended && Object.keys(asset.extended).length > 0 && (
                <div className="md:col-span-2 pt-4 mt-4 border-t">
                  <h4 className="text-md font-semibold mb-2 text-foreground">Extended Properties:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    {Object.entries(asset.extended).map(([key, value]) => (
                      <DetailItem key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={String(value)} />
                    ))}
                  </div>
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <DetailItem label="Vendor" value={asset.hardware?.vendor} icon={<Tag className="h-4 w-4" />} />
              <DetailItem label="Model" value={asset.hardware?.model} icon={<Tag className="h-4 w-4" />} />
              <DetailItem label="Type" value={asset.hardware?.type} icon={<HardDrive className="h-4 w-4" />} />
              <DetailItem label="Category" value={asset.hardware?.category} icon={<Layers className="h-4 w-4" />} />
              <DetailItem label="Hardware Version" value={asset.hardware?.version} icon={<Info className="h-4 w-4" />} />
              <DetailItem label="Order Number" value={asset.hardware?.orderNumber} icon={<Binary className="h-4 w-4" />} />
              <DetailItem label="Hardware Ref" value={asset.hardware?.ref} icon={<Tag className="h-4 w-4"/>} />
              <DetailItem label="Hardware Description" value={asset.hardware?.description} icon={<FileText className="h-4 w-4"/>} fullWidth />
              <DetailItem label="Vendor Link" value={asset.hardware?.vendorLink} icon={<LinkIcon className="h-4 w-4"/>} fullWidth />
              <DetailItem label="End of Life" value={formatDate(asset.hardware?.endOfLife)} icon={<CalendarDays className="h-4 w-4" />} />
              
              <DetailItem label="CPU (Legacy)" value={asset.cpu} icon={<HardDrive className="h-4 w-4" />} />
              <DetailItem label="RAM (Legacy)" value={asset.ram} icon={<HardDrive className="h-4 w-4" />} />
              <DetailItem label="Storage (Legacy)" value={asset.storage} icon={<HardDrive className="h-4 w-4" />} />

              {asset.hardware?.extended && Object.keys(asset.hardware.extended).length > 0 && (
                <div className="md:col-span-2 pt-4 mt-4 border-t">
                  <h4 className="text-md font-semibold mb-2 text-foreground">Hardware Extended Properties:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    {Object.entries(asset.hardware.extended).map(([key, value]) => (
                       <DetailItem key={`hw-ext-${key}`} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={String(value)} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "context" && (
           <Card>
            <CardHeader>
              <CardTitle>Contextual Information</CardTitle>
              <CardDescription>Location, system, and business process associations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {asset.context?.location && (
                  <div>
                      <h4 className="text-md font-semibold mb-2 text-foreground flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary"/>Primary Location</h4>
                      <DetailItem label="Name" value={asset.context.location.name} />
                      <DetailItem label="Location ID" value={asset.context.location.locationId} />
                      <DetailItem label="Ref" value={asset.context.location.ref} />
                  </div>
              )}
              {asset.context?.referenceLocation && (
                  <div className="pt-4 border-t">
                      <h4 className="text-md font-semibold mb-2 text-foreground flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary"/>Reference Location</h4>
                      <DetailItem label="Name" value={asset.context.referenceLocation.name} />
                      <DetailItem label="Location ID" value={asset.context.referenceLocation.locationId} />
                      <DetailItem label="Ref" value={asset.context.referenceLocation.ref} />
                  </div>
              )}
               {asset.context?.otSystem && (
                  <div className="pt-4 border-t">
                      <h4 className="text-md font-semibold mb-2 text-foreground flex items-center"><Layers className="mr-2 h-5 w-5 text-primary"/>OT System</h4>
                      <DetailItem label="Name" value={asset.context.otSystem.name} />
                      <DetailItem label="ID" value={asset.context.otSystem.id} />
                  </div>
              )}
              <DetailItem label="Device Group" value={asset.context?.deviceGroup} icon={<Users2 className="h-4 w-4" />} />
              {asset.context?.businessProcesses && asset.context.businessProcesses.length > 0 && (
                   <div className="pt-4 border-t">
                      <h4 className="text-md font-semibold mb-2 text-foreground flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Business Processes ({asset.context.businessProcesses.length})</h4>
                      <ScrollArea className="h-[200px] pr-2">
                        <ul className="space-y-3">
                        {asset.context.businessProcesses.map((bp, index) => (
                            <li key={bp.ref || index} className="text-sm p-3 border rounded-md bg-secondary/30">
                                <p className="font-medium">{bp.name || 'Unnamed Process'}</p>
                                <p>Role: {bp.role || 'N/A'}</p>
                                <p>Criticality: {bp.criticality || 'N/A'}</p>
                                {bp.ref && <p className="text-xs text-muted-foreground">Ref: {bp.ref}</p>}
                            </li>
                        ))}
                        </ul>
                      </ScrollArea>
                  </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {activeSection === "connections" && (
          <Card>
            <CardHeader>
              <CardTitle>Network Connections</CardTitle>
              <CardDescription>Details about network interfaces and connections. Found {asset.connections?.length || 0} connection(s).</CardDescription>
            </CardHeader>
            <CardContent>
              {asset.connections && asset.connections.length > 0 ? (
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-6">
                    {asset.connections.map((conn: NetworkConnection, index: number) => (
                      <div key={conn.networkRef || index} className="p-4 border rounded-md bg-secondary/30">
                        <h4 className="text-md font-semibold mb-3 text-foreground">Connection {index + 1} (IF: {conn.ifName || 'N/A'})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
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
                          <DetailItem label="Counterpart Device ID" value={conn.counterpart} />
                          <DetailItem label="Remote Port" value={conn.remotePort} />
                          <DetailItem label="Remote Description" value={conn.remoteDesc} fullWidth/>
                          <DetailItem label="Network Ref" value={conn.networkRef} />
                          {conn.networkLocation && (
                              <div className="md:col-span-2 mt-2 pt-2 border-t">
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Network Location:</p>
                                  <DetailItem label="Name" value={conn.networkLocation.name} />
                                  <DetailItem label="ID" value={conn.networkLocation.locationId} />
                                  <DetailItem label="Ref" value={conn.networkLocation.ref} />
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
              <CardTitle>OS, Firmware & Installed Software</CardTitle>
              <CardDescription>
                Operating System/Firmware: {asset.os_firmware || "N/A"}. 
                Found {asset.software?.length || 0} installed software item(s).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {asset.software && asset.software.length > 0 ? (
                <ScrollArea className="h-[400px] pr-2">
                  <ul className="space-y-0">
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <DetailItem label="Installation Date" value={formatDate(asset.installationDate)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Manufacture Date" value={formatDate(asset.manufactureDate)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Current Stage" value={asset.stage} icon={<GanttChartSquare className="h-4 w-4" />} />
              <DetailItem label="Product Lifecycle Stage" value={asset.lifecycle} icon={<History className="h-4 w-4" />} />
              <DetailItem label="Last Seen" value={formatDate(asset.last_seen)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Config Last Modified" value={formatDate(asset.modified)} icon={<CalendarDays className="h-4 w-4" />} />
              
              {asset.warranty && (
                  <>
                      <DetailItem label="Warranty Start Date" value={formatDate(asset.warranty.startDate)} icon={<CalendarDays className="h-4 w-4" />} />
                      <DetailItem label="Warranty End Date" value={formatDate(asset.warranty.endDate)} icon={<CalendarDays className="h-4 w-4" />} />
                      <DetailItem label="Warranty Provider" value={asset.warranty.provider} icon={<UserCheck className="h-4 w-4" />} />
                      <DetailItem label="Warranty Terms" value={asset.warranty.terms} icon={<FileText className="h-4 w-4" />} fullWidth/>
                  </>
              )}
              <DetailItem label="Retirement Date (Legacy)" value={formatDate(asset.retirementDate)} icon={<CalendarDays className="h-4 w-4" />} />
              <DetailItem label="Assigned User (Legacy)" value={asset.assignedUser} icon={<Users className="h-4 w-4" />} />
              <DetailItem label="Department (Legacy)" value={asset.department} icon={<Users className="h-4 w-4" />} />
            </CardContent>
          </Card>
        )}

        {activeSection === "security" && (
            <Card>
                <CardHeader>
                    <CardTitle>Security & Compliance Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                      <DetailItem label="Authentication Method" value={asset.security?.authenticationMethod} icon={<ShieldAlert className="h-4 w-4"/>} />
                      <DetailItem label="Encryption Enabled" value={asset.security?.encryptionEnabled} icon={<ShieldAlert className="h-4 w-4"/>} />
                      <DetailItem label="Last Security Assessment" value={formatDate(asset.security?.lastSecurityAssessment)} icon={<CalendarDays className="h-4 w-4"/>} />
                      <DetailItem label="Security Score" value={asset.security?.securityScore} icon={<Thermometer className="h-4 w-4"/>} />
                    </div>
                    
                    {asset.security?.vulnerabilities && asset.security.vulnerabilities.length > 0 && (
                      <div className="pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold mb-2 text-foreground">Vulnerabilities ({asset.security.vulnerabilities.length}):</h4>
                        <ScrollArea className="h-[200px] pr-2">
                          <ul className="space-y-3">
                            {asset.security.vulnerabilities.map((vuln: AssetVulnerability, idx: number) => (
                              <li key={vuln.ref || idx} className="text-sm p-3 border rounded-md bg-secondary/30">
                                <p><strong>Ref:</strong> {vuln.ref || 'N/A'}</p>
                                <p><strong>Status:</strong> {vuln.status || 'Unknown'}</p>
                                <p><strong>Discovered:</strong> {formatDate(vuln.discoveryDate)}</p>
                                {vuln.mitigationDate && <p><strong>Mitigated:</strong> {formatDate(vuln.mitigationDate)}</p>}
                                {vuln.mitigationMethod && <p><strong>Method:</strong> {vuln.mitigationMethod}</p>}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}
                    {asset.compliance?.frameworks && asset.compliance.frameworks.length > 0 && (
                       <div className="pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold mb-2 text-foreground">Compliance Frameworks ({asset.compliance.frameworks.length}):</h4>
                         <ScrollArea className="h-[150px] pr-2">
                            <ul className="space-y-3">
                                {asset.compliance.frameworks.map((fw: ComplianceFrameworkAssociation, idx: number) => (
                                <li key={fw.ref || idx} className="text-sm p-3 border rounded-md bg-secondary/30">
                                    <p><strong>Ref:</strong> {fw.ref || 'N/A Framework'}</p>
                                    <p><strong>Status:</strong> {fw.status || 'Unknown Status'}</p>
                                    <p><strong>Last Assessed:</strong> {formatDate(fw.lastAssessment)}</p>
                                    <p><strong>Findings:</strong> {fw.findings ?? 'N/A'}</p>
                                </li>
                                ))}
                            </ul>
                         </ScrollArea>
                       </div>
                    )}
                    {asset.security?.securityControls && asset.security.securityControls.length > 0 && (
                       <div className="pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold mb-2 text-foreground">Security Controls ({asset.security.securityControls.length}):</h4>
                         <ScrollArea className="h-[150px] pr-2">
                            <ul className="space-y-3">
                                {asset.security.securityControls.map((sc, idx) => (
                                <li key={sc.ref || idx} className="text-sm p-3 border rounded-md bg-secondary/30">
                                    <p><strong>Ref:</strong> {sc.ref || 'N/A Control'}</p>
                                    <p><strong>Status:</strong> {sc.implementationStatus || 'Unknown Status'}</p>
                                    <p><strong>Last Verified:</strong> {formatDate(sc.lastVerified)}</p>
                                </li>
                                ))}
                            </ul>
                         </ScrollArea>
                       </div>
                    )}
                </CardContent>
            </Card>
        )}

        {activeSection === "maintenance" && (
          <Card>
              <CardHeader>
                  <CardTitle>Maintenance Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  {asset.maintenance?.schedule && (
                    <div>
                      <h4 className="text-md font-semibold mb-2 text-foreground flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Schedule</h4>
                      <DetailItem label="Maintenance Frequency" value={asset.maintenance.schedule.frequency} />
                      <DetailItem label="Next Scheduled Maintenance" value={formatDate(asset.maintenance.schedule.nextScheduled)} />
                      <DetailItem label="Last Performed Maintenance" value={formatDate(asset.maintenance.schedule.lastPerformed)} />
                    </div>
                  )}
                  <DetailItem label="Maintenance Records Count" value={asset.maintenance?.records?.length ?? 0} icon={<ListChecks className="h-4 w-4"/>} />
                  {/* TODO: List maintenance records if available. Requires fetching actual records by ref. */}
                  {asset.maintenance?.records && asset.maintenance.records.length > 0 && (
                    <div className="pt-4 mt-4 border-t">
                       <h4 className="text-md font-semibold mb-2 text-foreground">Maintenance Record Refs:</h4>
                       <ul className="list-disc pl-5">
                        {asset.maintenance.records.map((rec, idx) => <li key={idx} className="text-sm text-muted-foreground">{rec.ref}</li>)}
                       </ul>
                    </div>
                  )}
              </CardContent>
          </Card>
        )}

        {activeSection === "monitoring" && (
          <Card>
              <CardHeader>
                  <CardTitle>Monitoring & Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                   <DetailItem label="Last Seen By (Discovery Node)" value={asset.last_seen_by} icon={<Eye className="h-4 w-4"/>} />
                   <DetailItem label="Last Patch Date" value={formatDate(asset.last_patch_date)} icon={<CalendarDays className="h-4 w-4"/>} />
                   <DetailItem label="Days Since Last Patch" value={asset.days_since_last_patch} icon={<History className="h-4 w-4"/>} />
                   
                   {asset.monitors && asset.monitors.length > 0 && (
                    <div className="pt-4 mt-4 border-t">
                      <h4 className="text-md font-semibold mb-2 text-foreground">Monitors ({asset.monitors.length}):</h4>
                      <ScrollArea className="h-[200px] pr-2">
                        <ul className="space-y-3">
                          {asset.monitors.map((monitor: MonitorInfo, idx: number) => (
                            <li key={idx} className="text-sm p-3 border rounded-md bg-secondary/30">
                              <p><strong>Node:</strong> {monitor.monitor_name || 'N/A'}</p>
                              <p><strong>Last Scan:</strong> {formatDate(monitor.last_scan)}</p>
                              <p><strong>Last Seen by Node:</strong> {formatDate(monitor.last_seen)}</p>
                              <p><strong>Result:</strong> {monitor.last_result || 'N/A'}</p>
                              <p><strong>Version:</strong> {monitor.last_version || 'N/A'}</p>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                   )}

                   {asset.behavior?.normalPatterns && asset.behavior.normalPatterns.length > 0 && (
                    <div className="pt-4 mt-4 border-t">
                      <h4 className="text-md font-semibold mb-2 text-foreground">Normal Behavior Patterns ({asset.behavior.normalPatterns.length}):</h4>
                       <ScrollArea className="h-[150px] pr-2">
                          <ul className="space-y-3">
                            {asset.behavior.normalPatterns.map((pattern: BehaviorPattern, idx: number) => (
                              <li key={idx} className="text-sm p-3 border rounded-md bg-secondary/30">
                                <p><strong>Type:</strong> {pattern.type || 'N/A'}</p>
                                <p><strong>Description:</strong> {pattern.description || 'N/A'}</p>
                              </li>
                            ))}
                          </ul>
                       </ScrollArea>
                     </div>
                   )}
                   {asset.behavior?.anomalyDetection && (
                      <div className="pt-4 mt-4 border-t">
                        <h4 className="text-md font-semibold mb-2 text-foreground flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-primary"/>Anomaly Detection:</h4>
                        <DetailItem label="Enabled" value={asset.behavior.anomalyDetection.enabled} />
                        <DetailItem label="Sensitivity" value={asset.behavior.anomalyDetection.sensitivity} />
                        <DetailItem label="Last Anomaly" value={formatDate(asset.behavior.anomalyDetection.lastAnomaly)} />
                      </div>
                   )}
              </CardContent>
          </Card>
        )}
        
        {activeSection === "risk" && (
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>Overall risk profile for {asset.name}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <DetailItem label="Overall Risk Score" value={asset.riskAssessment?.overallRisk} icon={<Thermometer className="h-4 w-4"/>} />
              <DetailItem label="Impact to Business Processes" value={asset.riskAssessment?.impactToBusinessProcesses} icon={<AlertTriangle className="h-4 w-4"/>} />
              <DetailItem label="Threat Level" value={asset.riskAssessment?.threatLevel} icon={<ShieldAlert className="h-4 w-4"/>} />
              <DetailItem label="Last Assessed" value={formatDate(asset.riskAssessment?.lastAssessed)} icon={<CalendarDays className="h-4 w-4"/>} />
            </CardContent>
          </Card>
        )}

        {activeSection === "ai_mitigations" && (
          <SecurityMitigationsTab asset={asset} />
        )}

      </div>
    </div>
  );
}
