
import type { Asset, AssetHardware, AssetSoftware, DeviceContext, DeviceHardware, DeviceSecurity, NetworkConnection, Warranty } from '@/types';

export const mockAssets: Asset[] = [
  {
    _id: '605c724f966d5e5a5c5af3b1',
    deviceRef: 'DEVREF001',
    deviceId: 'ASSET001', // Old 'id'
    name: 'Primary Control PLC',
    description: 'Main PLC for production line A. Critical asset.', // Old 'notes'
    documentation: 'https://example.com/docs/plc001',
    installationDate: '2022-01-15T00:00:00Z', // Old 'purchaseDate'
    manufactureDate: '2021-12-01T00:00:00Z',
    warranty: {
      startDate: '2022-01-15T00:00:00Z',
      endDate: '2025-01-14T00:00:00Z', // Old 'warrantyEndDate'
      provider: 'PLC Corp Assurance',
      terms: '3-year limited warranty on parts and labor.',
    },
    stage: 'Operational', // Old 'status' ('Active')
    lifecycle: 'Active Support',
    serialNumber: 'PLCCTRL001XYZ',
    last_seen: '2024-07-30T10:00:00.000Z', // Old 'lastSeen'
    zone: 'Manufacturing Zone 1',
    safety: {
      certification: 'SIL 3',
      level: '3',
      lastAssessment: '2024-01-10T00:00:00Z',
    },
    release: 'v2.5.3',
    criticality: {
      rating: 'High',
      impact: 9,
      businessCriticality: 10,
    },
    modified: '2024-07-01T14:30:00Z',
    exposure: 'Isolated Industrial Network',
    hardware: { // Old 'manufacturer', 'model', 'assetType' (via type/category)
      ref: 'HWREF001',
      vendor: 'Siemens', // Old 'manufacturer'
      model: 'Simatic S7-1500', // Old 'model'
      type: 'PLC', // Influences old 'assetType'
      category: 'Automation Device',
      version: 'CPU 1516-3 PN/DP',
      orderNumber: '6ES7516-3AN02-0AB0',
      vendorLink: 'https://siemens.com/s7-1500',
      description: 'High-performance PLC for complex automation tasks.',
      endOfLife: '2035-12-31T00:00:00Z',
      extended: {
        MTBF: 20, // years
        powerConsumption: '15W',
      },
    } as DeviceHardware, // Added 'as DeviceHardware' to satisfy stricter type
    context: {
      location: { // Old 'location'
        ref: 'LOCREF001',
        name: 'Factory A, Production Line 1, Panel 3', // Old 'location' string
        locationId: 'F1PL1P3',
      },
      referenceLocation: {
        ref: 'LOCREF00SITE',
        name: 'Springfield Plant',
        locationId: 'SITE_SPF',
      },
      otSystem: {
        name: 'Line A Control System',
        id: 'LACS_001',
      },
      deviceGroup: 'Critical PLCs',
      businessProcesses: [
        { ref: 'BPREF001', name: 'Product Assembly Line A', criticality: 'High', role: 'Primary Controller' },
      ],
    },
    os_firmware: 'TIA Portal V17 FW 2.9.2', // Old 'operatingSystem'
    softwareList: [ // Old 'softwareList'
      { ref: 'SWREF001', vendor: 'Siemens', name: 'TIA Portal Runtime', version: 'V17 Update 6', installDate: '2022-02-01T00:00:00Z', patchLevel: 'HF4' },
      { ref: 'SWREF002', vendor: 'Kepware', name: 'KEPServerEX', version: '6.10', installDate: '2022-03-10T00:00:00Z', patchLevel: '6.10.123' },
    ],
    tags: ['critical', 'line-a', 'siemens-plc', 'production'],
    connections: [ // Old 'ipAddress', 'macAddress'
      {
        networkRef: 'NETREF001',
        network: 'PROFINET_LINE_A',
        networkId: 'PN001A',
        networkGroup: 'Industrial Control',
        medium: 'Copper',
        L2Address: '00:1A:2B:3C:4D:EE', // Example MAC
        L3Address: '192.168.10.50', // Example IP
        networkAddress: '192.168.10.0/24',
        networkType: 'Profinet',
        port: 'X1 P1',
        vlan: '100',
        ifName: 'eth0',
        ifStatus: 'Up',
      },
    ],
    extended: {
      customCycleTime: '10ms',
      ioModulesAttached: 5,
    },
    last_seen_by: 'DiscoveryNodeEastWing',
    monitors: [{ monitor_name: 'DiscoveryNodeEastWing', last_scan: '2024-07-30T09:55:00Z', last_version: '1.2.3', last_result: 'OK', last_seen: '2024-07-30T10:00:00Z' }],
    last_patch_date: '2024-06-15T00:00:00Z',
    days_since_last_patch: 45, // Calculated field
    security: { // Old 'knownVulnerabilities'
      vulnerabilities: [
        { ref: 'VULNREF001', status: 'Mitigated', discoveryDate: '2023-11-01T00:00:00Z', mitigationDate: '2023-11-15T00:00:00Z', mitigationMethod: 'Firmware Update to 2.9.2' },
        { ref: 'VULNREF002', status: 'Open', discoveryDate: '2024-07-20T00:00:00Z', mitigationMethod: 'Awaiting Patch from Vendor' },
      ],
      securityControls: [{ ref: 'SCREF001', implementationStatus: 'Implemented', lastVerified: '2024-07-01T00:00:00Z' }],
      authenticationMethod: 'Local User/Pass',
      encryptionEnabled: false,
      lastSecurityAssessment: '2024-01-15T00:00:00Z',
      securityScore: 75,
    },
    compliance: {
      frameworks: [{ ref: 'COMPREF001', status: 'Compliant', lastAssessment: '2024-02-01T00:00:00Z', findings: 0 }],
    },
    digitalTwin: { ref: 'DTREF001', lastSynced: '2024-07-30T08:00:00Z' },
    maintenance: {
      schedule: { frequency: 'Quarterly', nextScheduled: '2024-09-15T00:00:00Z', lastPerformed: '2024-06-10T00:00:00Z' },
      records: [{ ref: 'MNTREF001' }],
    },
    behavior: {
      normalPatterns: [{ type: 'Communication', description: 'Regular comms with HMI_01 and SCADA_MAIN' }],
      anomalyDetection: { enabled: true, sensitivity: 7, lastAnomaly: '2024-05-03T00:00:00Z' },
    },
    riskAssessment: { overallRisk: 8, impactToBusinessProcesses: 9, threatLevel: 'Medium', lastAssessed: '2024-07-01T00:00:00Z' },
    
    // Old fields kept for potential UI compatibility, to be reviewed:
    assignedUser: 'IT Department / OT Engineers', // Needs mapping from new schema if possible or different handling
    department: 'Manufacturing Automation', // Needs mapping
    // cpu, ram, storage would ideally be in hardware.extended or specific hardware specs
    cpu: 'ARM Cortex A53', // Example, should be in hardware.extended
    ram: '2GB', // Example, should be in hardware.extended
    storage: '16GB eMMC', // Example, should be in hardware.extended
    imageUrl: 'https://placehold.co/600x400.png', // Keep for UI
    purchaseCost: 3500, // Keep for UI, not in new schema
    currentValue: 3000, // Keep for UI, not in new schema
    retirementDate: '2038-12-31T00:00:00Z', // Keep for UI, related to hardware.endOfLife
    hostedOn: undefined, // Example value
  },
  {
    // ASSET002 - Marketing Lead Laptop (Simplified for brevity, needs full update)
    _id: '605c724f966d5e5a5c5af3b2',
    deviceRef: 'DEVREF002',
    deviceId: 'ASSET002',
    name: 'Marketing Lead Laptop',
    hardware: { vendor: 'Dell', model: 'XPS 15', type: 'Laptop' } as DeviceHardware,
    stage: 'Active',
    installationDate: '2023-03-20T00:00:00Z',
    serialNumber: 'SNLAPMKT002ABC',
    os_firmware: 'Windows 11 Pro',
    last_seen: '2024-07-29T11:00:00.000Z',
    assignedUser: 'Alice Wonderland',
    department: 'Marketing',
    softwareList: [
      { name: 'Microsoft Office 365', version: '2308' },
    ],
    connections: [{ L3Address: '192.168.5.123', L2Address: 'A1:B2:C3:D4:E5:F6'}],
    imageUrl: 'https://placehold.co/600x400.png',
    purchaseCost: 1800,
  },
  {
    // ASSET003 - Main Office Router (Simplified)
     _id: '605c724f966d5e5a5c5af3b3',
    deviceRef: 'DEVREF003',
    deviceId: 'ASSET003',
    name: 'Main Office Router',
    hardware: { vendor: 'MikroTik', model: 'RB5009UG+S+IN', type: 'Router' } as DeviceHardware,
    stage: 'Active',
    installationDate: '2021-11-01T00:00:00Z',
    serialNumber: 'SNROUT003DEF',
    os_firmware: 'RouterOS 7.x',
    last_seen: '2024-07-29T12:00:00.000Z',
    connections: [{L3Address: '192.168.1.1'}],
    imageUrl: 'https://placehold.co/600x400.png',
    purchaseCost: 300,
  },
  {
    // ASSET004 - Development Workstation 1 (Simplified)
    _id: '605c724f966d5e5a5c5af3b4',
    deviceRef: 'DEVREF004',
    deviceId: 'ASSET004',
    name: 'Development Workstation 1',
    hardware: { vendor: 'Custom Build', model: 'Ryzen 9 Custom', type: 'Workstation' } as DeviceHardware,
    stage: 'Active',
    installationDate: '2022-08-10T00:00:00Z',
    serialNumber: 'SNWKSTN001GHI',
    os_firmware: 'Pop!_OS 22.04 LTS',
    last_seen: '2024-07-29T13:00:00.000Z',
    assignedUser: 'Bob The Builder',
    department: 'Engineering',
    connections: [{L3Address: '192.168.1.50', L2Address: 'B2:C3:D4:E5:F6:A1'}],
    imageUrl: 'https://placehold.co/600x400.png',
    purchaseCost: 2200,
  },
  {
    // ASSET005 - Shared Office Printer (Simplified)
    _id: '605c724f966d5e5a5c5af3b5',
    deviceRef: 'DEVREF005',
    deviceId: 'ASSET005',
    name: 'Shared Office Printer',
    hardware: { vendor: 'HP', model: 'LaserJet Pro MFP M428fdw', type: 'Printer' } as DeviceHardware,
    stage: 'In Repair',
    installationDate: '2020-05-05T00:00:00Z',
    serialNumber: 'SNPRINT005JKL',
    os_firmware: 'HP Firmware 20220408',
    last_seen: '2024-07-26T14:00:00.000Z',
    description: 'Paper jam issue, technician called.',
    security: { vulnerabilities: [{ discoveryDate: '2023-01-01T00:00:00Z', status: 'Open', ref: 'CVE-2022-9999' }] },
    connections: [{L3Address: '192.168.1.200'}],
    imageUrl: 'https://placehold.co/600x400.png',
    purchaseCost: 450,
  }
];

    