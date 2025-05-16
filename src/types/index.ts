
// export type AssetType = 'Server' | 'Workstation' | 'Laptop' | 'Router' | 'Switch' | 'Printer' | 'MobileDevice' | 'Other';
// export type AssetStatus = 'Active' | 'Inactive' | 'In Repair' | 'Disposed' | 'Missing' | 'On Order';

// AssetType and AssetStatus are now strings to accommodate the new schema.
// UI components using these will need adaptation.
export type AssetType = string; //  Derived from new schema's hardware.type or hardware.category
export type AssetStatus = string; // Derived from new schema's stage

export interface AssetSoftware {
  ref?: string; // ObjectId string reference to software collection
  vendor?: string;
  name: string; // product name
  version: string; // product version
  installDate?: string; // ISO date string
  patchLevel?: string;
}

export interface Warranty {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  provider?: string;
  terms?: string;
}

export interface Safety {
  certification?: string;
  level?: string; // safety integrity level (SIL)
  lastAssessment?: string; // ISO date string
}

export interface Criticality {
  rating?: string;
  impact?: number; // 1-10
  businessCriticality?: number; // 1-10
}

export interface DeviceHardware {
  ref?: string; // ObjectId string - reference to hardware collection
  vendor?: string;
  model?: string;
  type?: string; // e.g., PLC, RTU - maps to AssetType
  category?: string; // e.g., computer, automation device
  version?: string; // product version
  orderNumber?: string;
  vendorLink?: string;
  description?: string;
  endOfLife?: string; // ISO date string
  extended?: Record<string, any>; // For custom fields like MTBF
}

export interface ContextLocation {
  ref?: string; // ObjectId string - reference to location collection
  name?: string;
  locationId?: string;
}

export interface OtSystem {
  name?: string;
  id?: string;
}

export interface BusinessProcessAssociation {
  ref?: string; // ObjectId string - reference to business process collection
  name?: string;
  criticality?: string;
  role?: string;
}

export interface DeviceContext {
  location?: ContextLocation;
  referenceLocation?: ContextLocation;
  otSystem?: OtSystem;
  deviceGroup?: string;
  businessProcesses?: BusinessProcessAssociation[];
}

export interface NetworkConnection {
  networkRef?: string; // ObjectId string - reference to network collection
  network?: string; // network name
  networkId?: string; // auto-assigned
  networkGroup?: string;
  medium?: string; // Copper, Fiber, ...
  L2Address?: string; // MAC Address
  L3Address?: string; // IP Address
  networkAddress?: string; // IP address of the network
  networkType?: string; // IP, Profibus, ...
  port?: string;
  vlan?: string;
  counterpart?: string; // counterpart device identifier
  remotePort?: string;
  remoteDesc?: string;
  ifName?: string;
  ifStatus?: string;
  ifDHCP?: string;
  speed?: string;
  duplex?: string;
  networkLocation?: ContextLocation;
}

export interface MonitorInfo {
  monitor_name?: string;
  last_scan?: string; // ISO date string
  last_version?: string;
  last_result?: string;
  last_seen?: string; // ISO date string
}

export interface AssetVulnerability {
  ref?: string; // ObjectId string - reference to vulnerability collection
  status?: string; // open, mitigated, resolved
  discoveryDate?: string; // ISO date string
  mitigationDate?: string; // ISO date string
  mitigationMethod?: string;
}

export interface SecurityControlAssociation {
  ref?: string; // ObjectId string - reference to security controls collection
  implementationStatus?: string;
  lastVerified?: string; // ISO date string
}

export interface DeviceSecurity {
  vulnerabilities?: AssetVulnerability[];
  securityControls?: SecurityControlAssociation[];
  authenticationMethod?: string;
  encryptionEnabled?: boolean;
  lastSecurityAssessment?: string; // ISO date string
  securityScore?: number; // 0-100
}

export interface ComplianceFrameworkAssociation {
  ref?: string; // ObjectId string - reference to compliance framework collection
  status?: string;
  lastAssessment?: string; // ISO date string
  findings?: number;
}

export interface DeviceCompliance {
  frameworks?: ComplianceFrameworkAssociation[];
}

export interface DigitalTwinLink {
  ref?: string; // ObjectId string - reference to digital twin collection
  lastSynced?: string; // ISO date string
}

export interface MaintenanceSchedule {
  frequency?: string;
  nextScheduled?: string; // ISO date string
  lastPerformed?: string; // ISO date string
}

export interface MaintenanceRecordLink {
  ref?: string; // ObjectId string - reference to maintenance record collection
}

export interface DeviceMaintenance {
  schedule?: MaintenanceSchedule;
  records?: MaintenanceRecordLink[];
}

export interface BehaviorPattern {
  type?: string; // communication, resource usage, etc.
  description?: string;
}

export interface AnomalyDetection {
  enabled?: boolean;
  sensitivity?: number; // 1-10
  lastAnomaly?: string; // ISO date string
}

export interface DeviceBehavior {
  normalPatterns?: BehaviorPattern[];
  anomalyDetection?: AnomalyDetection;
}

export interface RiskAssessment {
  overallRisk?: number; // 1-10
  impactToBusinessProcesses?: number; // 1-10
  threatLevel?: string; // low, medium, high
  lastAssessed?: string; // ISO date string
}

export interface Asset {
  // Core Identifiers (from new schema)
  _id?: string; // MongoDB ObjectId as string
  deviceRef: string; // unique database reference, never changes
  deviceId: string; // unique user-changeable identifier (maps to old 'id')

  // General Information (mapped and new)
  name: string;
  description?: string; // (maps to old 'notes')
  documentation?: string;
  installationDate?: string; // (maps to old 'purchaseDate')
  manufactureDate?: string;
  warranty?: Warranty;
  stage?: AssetStatus; // lifecycle stage (maps to old 'status')
  lifecycle?: string; // product lifecycle stage
  serialNumber?: string;
  last_seen?: string; // (maps to old 'lastSeen')
  zone?: string;
  safety?: Safety;
  release?: string;
  criticality?: Criticality;
  modified?: string; // ISO date string (config last modified)
  exposure?: string; // e.g., "local"

  // Hardware Details (mapped and new)
  hardware: DeviceHardware; // Contains vendor (manufacturer), model, type (assetType), etc.

  // Contextual Information (new)
  context?: DeviceContext;

  // OS/Firmware (mapped)
  os_firmware?: string; // (maps to old 'operatingSystem')

  // Software List (structure updated)
  softwareList?: AssetSoftware[]; // (old 'softwareList' with updated AssetSoftware interface)

  // Tags (new)
  tags?: string[];

  // Connections (new, replaces simple ip/mac)
  connections?: NetworkConnection[];

  // Extended/Custom Fields (new)
  extended?: Record<string, any>;

  // Monitoring (new)
  last_seen_by?: string;
  monitors?: MonitorInfo[];

  // Patching (new)
  last_patch_date?: string; // ISO date string
  days_since_last_patch?: number;

  // Security (new, replaces simple knownVulnerabilities string array)
  security?: DeviceSecurity;

  // Compliance (new)
  compliance?: DeviceCompliance;

  // Digital Twin (new)
  digitalTwin?: DigitalTwinLink;

  // Maintenance (new)
  maintenance?: DeviceMaintenance;

  // Behavior (new)
  behavior?: DeviceBehavior;

  // Risk Assessment (new)
  riskAssessment?: RiskAssessment;

  // --- Fields from old schema to review/reconcile ---
  // assetType: AssetType; // Now derived from hardware.type or hardware.category
  // status: AssetStatus; // Now from 'stage'
  // location?: string; // Now in context.location.name
  // purchaseDate?: string; // Now 'installationDate'
  // warrantyEndDate?: string; // Now in 'warranty.endDate'
  assignedUser?: string; // Not in new Devices schema, keep for now as UI might use it
  department?: string; // Not in new Devices schema, keep for now
  // ipAddress?: string; // Now in 'connections' array
  // macAddress?: string; // Now in 'connections' array
  // operatingSystem?: string; // Now 'os_firmware'
  cpu?: string; // Not in new schema, could be in hardware.extended. Keep for UI.
  ram?: string; // Not in new schema, could be in hardware.extended. Keep for UI.
  storage?: string; // Not in new schema, could be in hardware.extended. Keep for UI.
  // model?: string; // Now in hardware.model
  // manufacturer?: string; // Now in hardware.vendor
  // notes?: string; // Now 'description'
  // knownVulnerabilities?: string[]; // Now in security.vulnerabilities (structured)
  imageUrl?: string; // Not in new schema, keep for UI
  purchaseCost?: number; // Not in new schema, keep for UI
  currentValue?: number; // Not in new schema, keep for UI
  retirementDate?: string; // Not in new schema, related to hardware.endOfLife or lifecycle. Keep for UI.
  hostedOn?: string; // From new schema: device identifier of the virtualization host
}

    