
export type AssetType = 'Server' | 'Workstation' | 'Laptop' | 'Router' | 'Switch' | 'Printer' | 'MobileDevice' | 'Other';
export type AssetStatus = 'Active' | 'Inactive' | 'In Repair' | 'Disposed' | 'Missing' | 'On Order';

export interface Software {
  id: string;
  name: string;
  version: string;
  installDate?: string; // ISO date string
  licenseKey?: string;
  vendor?: string;
}

export interface Asset {
  id: string;
  name: string;
  assetType: AssetType;
  status: AssetStatus;
  location?: string;
  purchaseDate?: string; // ISO date string
  warrantyEndDate?: string; // ISO date string
  assignedUser?: string;
  department?: string;
  ipAddress?: string;
  macAddress?: string;
  operatingSystem?: string;
  cpu?: string;
  ram?: string; // e.g., "16GB DDR4"
  storage?: string; // e.g., "512GB SSD"
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  notes?: string;
  softwareList?: Software[];
  knownVulnerabilities?: string[]; // Array of vulnerability descriptions or CVEs
  imageUrl?: string; // For placeholder images
  lastSeen?: string; // ISO date string
  purchaseCost?: number;
  currentValue?: number;
  retirementDate?: string; // ISO date string
}
