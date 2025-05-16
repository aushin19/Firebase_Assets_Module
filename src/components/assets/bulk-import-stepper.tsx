
// src/components/assets/bulk-import-stepper.tsx
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileUp, Loader2, ListChecks, Eye, UploadCloud, Check, X as XIcon, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Asset } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from '../ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from '../ui/separator';

type DataRow = Record<string, any>;
type ColumnMapping = Record<string, string | null>; // CSV/JSON Header -> AssetFieldKey
type CustomMapping = { sourceHeader: string; targetKey: string; id: string; };


const ASSET_FIELDS_TO_MAP: string[] = [
  'deviceId', 'name', 'description', 'documentation',
  'installationDate', 'manufactureDate', 'stage', 'lifecycle',
  'serialNumber', 'last_seen', 'zone', 'release', 'modified',
  'exposure', 'os_firmware', 'last_seen_by', 'last_patch_date',
  'days_since_last_patch', 'assignedUser', 'department',
  'cpu', 'ram', 'storage', 'imageUrl', 'purchaseCost',
  'currentValue', 'retirementDate', 'tags',
  'hardware.vendor', 'hardware.model', 'hardware.type', 'hardware.category', 'hardware.version', 'hardware.endOfLife', 'hardware.orderNumber', 'hardware.vendorLink', 'hardware.description', 'hardware.ref',
  'hardware.extended.MTBF', 'hardware.extended.powerConsumption', // Example specific hardware extended
  'context.location.name', 'context.location.locationId', 'context.location.ref',
  'context.referenceLocation.name', 'context.referenceLocation.locationId', 'context.referenceLocation.ref',
  'context.otSystem.name', 'context.otSystem.id', 'context.deviceGroup',
  'context.businessProcesses[0].name', 'context.businessProcesses[0].criticality', 'context.businessProcesses[0].role', 'context.businessProcesses[0].ref',
  'warranty.startDate', 'warranty.endDate', 'warranty.provider', 'warranty.terms',
  'criticality.rating', 'criticality.impact', 'criticality.businessCriticality',
  'safety.certification', 'safety.level', 'safety.lastAssessment',
  'security.authenticationMethod', 'security.encryptionEnabled', 'security.securityScore', 'security.lastSecurityAssessment',
  'digitalTwin.ref', 'digitalTwin.lastSynced',
  'maintenance.schedule.frequency', 'maintenance.schedule.nextScheduled', 'maintenance.schedule.lastPerformed',
  'behavior.anomalyDetection.enabled', 'behavior.anomalyDetection.sensitivity', 'behavior.anomalyDetection.lastAnomaly',
  'riskAssessment.overallRisk', 'riskAssessment.impactToBusinessProcesses', 'riskAssessment.threatLevel', 'riskAssessment.lastAssessed',
  'extended.customField1', 'extended.customField2', // Example general extended
];


const REQUIRED_ASSET_FIELDS: string[] = ['deviceId', 'name', 'stage'];

const ASSET_TYPE_VALUES_EXAMPLE: string[] = ['PLC', 'Laptop', 'Router', 'Workstation', 'Printer', 'MobileDevice', 'Server', 'Switch', 'Other', 'Sensor', 'HMI', 'RTU', 'Actuator'];
const ASSET_STAGE_VALUES_EXAMPLE: string[] = ['Operational', 'Active', 'Online', 'In Use', 'Standby', 'Inactive', 'Offline', 'Maintenance', 'In Repair', 'End of Life', 'Disposed', 'Retired', 'Missing', 'Planning', 'Commissioning', 'Testing', 'Active Support', 'Limited Support', 'Unsupported', 'Unknown'];

interface ValidatedAsset extends Partial<Asset> {
  _originalRow: DataRow;
  _validationErrors: Record<string, string>;
  _isValid: boolean;
}

interface StepProps {
  stepNumber: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
}

const StepperStep: React.FC<StepProps> = ({ stepNumber, title, isActive, isCompleted }) => (
  <div className="flex flex-col items-center">
    <motion.div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
        isActive ? "bg-primary text-primary-foreground border-primary" :
        isCompleted ? "bg-green-500 text-white border-green-500" :
        "bg-muted text-muted-foreground border-border"
      )}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {isCompleted && !isActive ? <Check size={16} /> : stepNumber}
    </motion.div>
    <p className={cn("mt-1 text-xs text-center", isActive ? "text-primary font-semibold" : "text-muted-foreground")}>{title}</p>
  </div>
);

const StepperConnector: React.FC<{isCompleted?: boolean; isActive?:boolean}> = ({isCompleted, isActive}) => (
   <div className={cn("flex-1 border-b-2 self-start mt-4 transition-colors", (isCompleted || isActive) ? "border-primary" : "border-border")} />
);

const getFieldLabel = (fieldKey: string): string => {
  if (!fieldKey) return "N/A";
  const overrides: Record<string, string> = {
    'deviceId': "Device ID", 'name': "Asset Name", 'os_firmware': "OS / Firmware", 'last_seen': "Last Seen",
    'hardware.vendor': "HW: Vendor", 'hardware.model': "HW: Model", 'hardware.type': "HW: Type",
    'hardware.category': "HW: Category", 'hardware.version': "HW: Version", 'hardware.endOfLife': "HW: End of Life",
    'hardware.orderNumber': "HW: Order Number", 'hardware.vendorLink': "HW: Vendor Link", 'hardware.description': "HW: Description", 'hardware.ref': "HW: Ref",
    'hardware.extended.MTBF': "HW Extended: MTBF (Yrs)", 'hardware.extended.powerConsumption': "HW Extended: Power",
    'context.location.name': "Location: Name", 'context.location.locationId': "Location: ID", 'context.location.ref': "Location: Ref",
    'context.referenceLocation.name': "Ref Location: Name", 'context.referenceLocation.locationId': "Ref Location: ID", 'context.referenceLocation.ref': "Ref Location: Ref",
    'context.otSystem.name': "OT System: Name", 'context.otSystem.id': "OT System: ID", 'context.deviceGroup': "Device Group",
    'context.businessProcesses[0].name': "BP1: Name", 'context.businessProcesses[0].criticality': "BP1: Criticality", 'context.businessProcesses[0].role': "BP1: Role", 'context.businessProcesses[0].ref': "BP1: Ref",
    'warranty.startDate': "Warranty: Start", 'warranty.endDate': "Warranty: End", 'warranty.provider': "Warranty: Provider", 'warranty.terms': "Warranty: Terms",
    'criticality.rating': "Criticality: Rating", 'criticality.impact': "Criticality: Impact Score", 'criticality.businessCriticality': "Criticality: Business Score",
    'safety.certification': "Safety: Certification", 'safety.level': "Safety: Level (SIL)", 'safety.lastAssessment': "Safety: Last Assessment",
    'security.authenticationMethod': "Security: Auth Method", 'security.encryptionEnabled': "Security: Encryption Enabled", 'security.securityScore': "Security: Score", 'security.lastSecurityAssessment': "Security: Last Assessment",
    'digitalTwin.ref': "Digital Twin: Ref", 'digitalTwin.lastSynced': "Digital Twin: Synced",
    'maintenance.schedule.frequency': "Maint: Frequency", 'maintenance.schedule.nextScheduled': "Maint: Next", 'maintenance.schedule.lastPerformed': "Maint: Last",
    'behavior.anomalyDetection.enabled': "Behavior: Anomaly On", 'behavior.anomalyDetection.sensitivity': "Behavior: Anomaly Sensitivity", 'behavior.anomalyDetection.lastAnomaly': "Behavior: Last Anomaly",
    'riskAssessment.overallRisk': "Risk: Overall Score", 'riskAssessment.impactToBusinessProcesses': "Risk: Impact to BP", 'riskAssessment.threatLevel': "Risk: Threat Level", 'riskAssessment.lastAssessed': "Risk: Last Assessment",
    'extended.customField1': "Ext: Custom Field 1", 'extended.customField2': "Ext: Custom Field 2",
    'tags': 'Tags (comma-separated in source)',
  };
  if (overrides[fieldKey]) return overrides[fieldKey];

  return fieldKey.split('.').map(part =>
    part.replace(/([A-Z0-9])/g, ' $1')
        .replace(/\[(\d+)\]/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
  ).join(' - ');
};

interface StatBlockProps {
  title: string;
  value: number | string;
  bgColor: string;
  textColor: string;
  icon?: React.ReactNode;
}

const StatBlock: React.FC<StatBlockProps> = ({ title, value, bgColor, textColor, icon }) => (
  <motion.div
    className={cn("p-4 rounded-lg shadow flex flex-col items-center justify-center text-center h-28", bgColor, textColor)}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    {icon && <div className="mb-1">{icon}</div>}
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs">{title}</p>
  </motion.div>
);

const cardVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeInOut" } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3, ease: "easeInOut" } }
};

export function BulkImportStepper() {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<DataRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [previewData, setPreviewData] = useState<ValidatedAsset[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [updateExisting, setUpdateExisting] = useState("yes_update");
  const [errorHandling, setErrorHandling] = useState("no_stop");
  const [importStats, setImportStats] = useState<{ total: number; created: number; updated: number; failed: number } | null>(null);

  // State for custom field mapping
  const [assetExtendedMappings, setAssetExtendedMappings] = useState<CustomMapping[]>([]);
  const [hardwareExtendedMappings, setHardwareExtendedMappings] = useState<CustomMapping[]>([]);
  const [customSourceHeader, setCustomSourceHeader] = useState('');
  const [customAssetTargetKey, setCustomAssetTargetKey] = useState('');
  const [customHardwareTargetKey, setCustomHardwareTargetKey] = useState('');


  const steps = [
    { number: 1, title: "Upload File" },
    { number: 2, title: "Map Fields" },
    { number: 3, title: "Validate Data" },
    { number: 4, title: "Import Results" },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile);
        toast({ title: 'File Selected', description: selectedFile.name });
      } else {
        toast({ title: 'Invalid File Type', description: 'Please upload a CSV or JSON file.', variant: 'destructive' });
        setFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const parseFile = useCallback(() => {
    if (!file) return;
    setIsProcessing(true);
    setFileData([]); setFileHeaders([]); setColumnMapping({}); setPreviewData([]); setImportStats(null);
    setAssetExtendedMappings([]); setHardwareExtendedMappings([]);

    const processParsedData = (data: DataRow[], headers: string[]) => {
        setFileHeaders(headers);
        setFileData(data);
        const initialMapping: ColumnMapping = {};
        headers.forEach(header => {
            const simpleHeader = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '');
            const foundAssetField = ASSET_FIELDS_TO_MAP.find(assetField => {
                const simpleAssetField = assetField.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '');
                if (simpleAssetField === simpleHeader) return true;
                const labelBasedGuess = getFieldLabel(assetField).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '');
                if (labelBasedGuess === simpleHeader) return true;
                const parts = assetField.split('.');
                if (parts.length > 1 && parts[parts.length - 1].toLowerCase().replace(/\[\d+\]/g, '') === simpleHeader) return true;
                return false;
            });
            initialMapping[header] = foundAssetField || null;
        });
        setColumnMapping(initialMapping);
        setIsProcessing(false);
        setCurrentStep(2);
    };

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      Papa.parse<DataRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0 && results.meta.fields?.length === 0) {
             toast({ title: 'Empty CSV File', description: 'The CSV file appears to be empty or has no headers.', variant: 'destructive' });
             setIsProcessing(false); return;
          }
          processParsedData(results.data, results.meta.fields || []);
        },
        error: (error) => {
          toast({ title: 'CSV Parsing Error', description: error.message, variant: 'destructive' });
          setIsProcessing(false);
        }
      });
    } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const jsonData = JSON.parse(text);
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            if (typeof jsonData[0] === 'object' && jsonData[0] !== null) {
              const headers = Object.keys(jsonData[0]);
              processParsedData(jsonData, headers);
            } else {
              toast({ title: 'Invalid JSON Format', description: 'JSON data should be an array of objects.', variant: 'destructive' });
              setIsProcessing(false);
            }
          } else if (Array.isArray(jsonData) && jsonData.length === 0) {
            toast({ title: 'Empty JSON Array', description: 'The JSON file is an empty array. No data to import.', variant: 'default' });
            processParsedData([], []);
          } else {
            toast({ title: 'Invalid JSON Format', description: 'JSON file should contain an array of asset objects.', variant: 'destructive' });
            setIsProcessing(false);
          }
        } catch (error) {
          toast({ title: 'JSON Parsing Error', description: (error as Error).message, variant: 'destructive' });
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        toast({ title: 'File Reading Error', description: 'Could not read the JSON file.', variant: 'destructive' });
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }
  }, [file, toast]);

  const handleMappingChange = (fileHeaderKey: string, assetFieldKey: string | null) => {
    setColumnMapping(prev => ({ ...prev, [fileHeaderKey]: assetFieldKey }));
  };

  const setNestedProperty = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    keys.forEach((key, index) => {
      const arrayMatch = key.match(/^(.*)\[(\d+)\]$/);
      let actualKey = key;
      let arrayIndex: number | undefined = undefined;

      if (arrayMatch) {
        actualKey = arrayMatch[1];
        arrayIndex = parseInt(arrayMatch[2]);
      }

      if (index === keys.length - 1) {
        if (arrayIndex !== undefined) {
          if (!current[actualKey] || !Array.isArray(current[actualKey])) current[actualKey] = [];
          current[actualKey][arrayIndex] = value;
        } else {
          current[actualKey] = value;
        }
      } else {
        if (arrayIndex !== undefined) {
          if (!current[actualKey] || !Array.isArray(current[actualKey])) current[actualKey] = [];
          if (!current[actualKey][arrayIndex]) current[actualKey][arrayIndex] = {};
          current = current[actualKey][arrayIndex];
        } else {
          if (!current[actualKey] || typeof current[actualKey] !== 'object') current[actualKey] = {};
          current = current[actualKey];
        }
      }
    });
  };

  const handleAddCustomMapping = (type: 'asset' | 'hardware') => {
    if (!customSourceHeader.trim() || (type === 'asset' && !customAssetTargetKey.trim()) || (type === 'hardware' && !customHardwareTargetKey.trim())) {
      toast({ title: "Missing Information", description: "Both source header and target key are required for custom mapping.", variant: "destructive" });
      return;
    }
    const newMapping: CustomMapping = {
      id: Date.now().toString(), // Simple unique ID
      sourceHeader: customSourceHeader.trim(),
      targetKey: type === 'asset' ? customAssetTargetKey.trim() : customHardwareTargetKey.trim(),
    };

    if (type === 'asset') {
      setAssetExtendedMappings(prev => [...prev, newMapping]);
    } else {
      setHardwareExtendedMappings(prev => [...prev, newMapping]);
    }
    setCustomSourceHeader(''); // Reset for next input
    setCustomAssetTargetKey('');
    setCustomHardwareTargetKey('');
    toast({ title: "Custom Mapping Added", description: `Mapped "${newMapping.sourceHeader}" to "${type}.extended.${newMapping.targetKey}"` });
  };

  const handleRemoveCustomMapping = (idToRemove: string, type: 'asset' | 'hardware') => {
    if (type === 'asset') {
      setAssetExtendedMappings(prev => prev.filter(m => m.id !== idToRemove));
    } else {
      setHardwareExtendedMappings(prev => prev.filter(m => m.id !== idToRemove));
    }
    toast({ title: "Custom Mapping Removed", variant: "default" });
  };


  const generatePreview = () => {
    setIsProcessing(true);
    setPreviewData([]);
    const validated: ValidatedAsset[] = fileData.slice(0, 10).map(row => {
      const asset: Partial<Asset> = { extended: {}, hardware: { extended: {} } as any }; // Ensure extended objects exist
      const errors: Record<string, string> = {};
      let isValidOverall = true;

      // Standard mappings
      fileHeaders.forEach(fileHeaderKey => {
        const assetFieldKey = columnMapping[fileHeaderKey];
        const originalValue = row[fileHeaderKey];

        if (assetFieldKey) {
          if (originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
            let convertedValue: any = originalValue;
            if (assetFieldKey === 'tags' && typeof originalValue === 'string') {
              convertedValue = originalValue.split(',').map(tag => tag.trim()).filter(tag => tag);
            } else if (['purchaseCost', 'currentValue', 'criticality.impact', 'criticality.businessCriticality', 'security.securityScore', 'days_since_last_patch', 'riskAssessment.overallRisk', 'hardware.extended.MTBF'].includes(assetFieldKey)) {
              const num = parseFloat(String(originalValue));
              if (isNaN(num)) { errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be a number.`; isValidOverall = false; }
              else { convertedValue = num; }
            } else if (['security.encryptionEnabled', 'behavior.anomalyDetection.enabled'].includes(assetFieldKey)) {
              if (String(originalValue).toLowerCase() === 'true') convertedValue = true;
              else if (String(originalValue).toLowerCase() === 'false') convertedValue = false;
              else { errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be true/false.`; isValidOverall = false; }
            } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate', 'hardware.endOfLife', 'warranty.startDate', 'warranty.endDate', 'safety.lastAssessment', 'security.lastSecurityAssessment', 'digitalTwin.lastSynced', 'maintenance.schedule.nextScheduled', 'maintenance.schedule.lastPerformed', 'behavior.anomalyDetection.lastAnomaly', 'riskAssessment.lastAssessed'].includes(assetFieldKey)) {
              if (originalValue) {
                const date = new Date(String(originalValue));
                if (isNaN(date.getTime())) { errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} invalid date.`; isValidOverall = false; }
                else { convertedValue = date.toISOString(); }
              }
            }
            if(isValidOverall || errors[fileHeaderKey] === undefined) {
              setNestedProperty(asset, assetFieldKey, convertedValue);
            }
          } else if (REQUIRED_ASSET_FIELDS.includes(assetFieldKey)) {
            errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} is required.`; isValidOverall = false;
          }
        }
      });

      // Custom Asset Extended Mappings
      assetExtendedMappings.forEach(customMap => {
        const originalValue = row[customMap.sourceHeader];
        if (originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
          setNestedProperty(asset, `extended.${customMap.targetKey}`, originalValue);
        }
      });

      // Custom Hardware Extended Mappings
      hardwareExtendedMappings.forEach(customMap => {
        const originalValue = row[customMap.sourceHeader];
        if (originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
          if (!asset.hardware) asset.hardware = { extended: {} } as any;
          if (!asset.hardware.extended) asset.hardware.extended = {};
          setNestedProperty(asset, `hardware.extended.${customMap.targetKey}`, originalValue);
        }
      });
      
      REQUIRED_ASSET_FIELDS.forEach(requiredAssetField => {
        // Check if a value for this required field exists in the partially constructed asset object
        const keys = requiredAssetField.split('.');
        let currentValue: any = asset;
        for (const key of keys) {
            if (currentValue && typeof currentValue === 'object' && key in currentValue) {
                currentValue = currentValue[key];
            } else {
                currentValue = undefined;
                break;
            }
        }

        if (currentValue === undefined || currentValue === null || String(currentValue).trim() === "") {
          // Only add error if no value was set from any mapping (standard or custom, if applicable to this field)
          if (!Object.values(columnMapping).includes(requiredAssetField) && 
              !assetExtendedMappings.some(m => `extended.${m.targetKey}` === requiredAssetField) &&
              !hardwareExtendedMappings.some(m => `hardware.extended.${m.targetKey}` === requiredAssetField)
          ) {
               // This logic might be too simple if required fields can be deeply nested and targeted by custom maps
               errors[`_unmapped_or_empty_${requiredAssetField}`] = `${getFieldLabel(requiredAssetField)} is required and is missing or empty.`;
               isValidOverall = false;
          } else if (Object.values(columnMapping).includes(requiredAssetField) && (currentValue === undefined || currentValue === null || String(currentValue).trim() === "")) {
              // Mapped but empty
              errors[`_empty_${requiredAssetField}`] = `${getFieldLabel(requiredAssetField)} is required but the mapped source field is empty.`;
              isValidOverall = false;
          }
        }
      });


      return { ...asset, _originalRow: row, _validationErrors: errors, _isValid: isValidOverall };
    });
    setPreviewData(validated);
    setIsProcessing(false);
    setCurrentStep(3);
  };

  const handleImport = () => {
    setIsProcessing(true);
    setImportStats(null); 

    const allValidatedAssets: ValidatedAsset[] = fileData.map(row => {
      const asset: Partial<Asset> = { extended: {}, hardware: { extended: {} } as any };
      let isValidOverall = true;
      const errors: Record<string, string> = {}; // For full data validation if needed, not just preview

      fileHeaders.forEach(fileHeaderKey => {
        const assetFieldKey = columnMapping[fileHeaderKey];
        const originalValue = row[fileHeaderKey];
        if (assetFieldKey && originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
          let convertedValue: any = originalValue;
           if (assetFieldKey === 'tags' && typeof originalValue === 'string') {
              convertedValue = originalValue.split(',').map(tag => tag.trim()).filter(tag => tag);
          } else if (['purchaseCost', 'currentValue', 'criticality.impact', 'criticality.businessCriticality', 'security.securityScore', 'days_since_last_patch', 'riskAssessment.overallRisk', 'hardware.extended.MTBF'].includes(assetFieldKey)) {
              const num = parseFloat(String(originalValue));
              if (isNaN(num)) { errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be a number.`; isValidOverall = false; }
              else { convertedValue = num; }
          } else if (['security.encryptionEnabled', 'behavior.anomalyDetection.enabled'].includes(assetFieldKey)) {
              if (String(originalValue).toLowerCase() === 'true') convertedValue = true;
              else if (String(originalValue).toLowerCase() === 'false') convertedValue = false;
              else { errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be true/false.`; isValidOverall = false; }
          } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate', 'hardware.endOfLife', 'warranty.startDate', 'warranty.endDate', 'safety.lastAssessment', 'security.lastSecurityAssessment', 'digitalTwin.lastSynced', 'maintenance.schedule.nextScheduled', 'maintenance.schedule.lastPerformed', 'behavior.anomalyDetection.lastAnomaly', 'riskAssessment.lastAssessed'].includes(assetFieldKey)) {
            if (originalValue) {
              const date = new Date(String(originalValue));
              if (isNaN(date.getTime())) { errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} invalid date.`; isValidOverall = false; }
              else { convertedValue = date.toISOString(); }
            }
          }
          if(isValidOverall || errors[fileHeaderKey] === undefined) { // Only set if value is valid or no error for this specific field
            setNestedProperty(asset, assetFieldKey, convertedValue);
          }
        } else if (assetFieldKey && REQUIRED_ASSET_FIELDS.includes(assetFieldKey)) {
            errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} is required.`; // Or fileHeaderKey for the unmapped required field
            isValidOverall = false;
        }
      });
      
      assetExtendedMappings.forEach(customMap => {
        const originalValue = row[customMap.sourceHeader];
        if (originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
           setNestedProperty(asset, `extended.${customMap.targetKey}`, originalValue);
        }
      });
      hardwareExtendedMappings.forEach(customMap => {
        const originalValue = row[customMap.sourceHeader];
        if (originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
          if (!asset.hardware) asset.hardware = { extended: {} } as any;
          if (!asset.hardware.extended) asset.hardware.extended = {};
          setNestedProperty(asset, `hardware.extended.${customMap.targetKey}`, originalValue);
        }
      });

      REQUIRED_ASSET_FIELDS.forEach(requiredAssetField => {
        const keys = requiredAssetField.split('.');
        let currentValue: any = asset;
        for (const key of keys) {
            if (currentValue && typeof currentValue === 'object' && key in currentValue) {
                currentValue = currentValue[key];
            } else {
                currentValue = undefined;
                break;
            }
        }
        if (currentValue === undefined || currentValue === null || String(currentValue).trim() === "") {
          // This check is complex because the required field might not be mapped directly
          // but through a custom mapping, or it might be missing entirely.
          // A simpler approach: if after all mappings, the required field isn't populated in `asset`, it's an error.
          errors[`_final_check_${requiredAssetField}`] = `${getFieldLabel(requiredAssetField)} is required and was not provided or is empty after mapping.`;
          isValidOverall = false;
        }
      });
      return { ...asset, _originalRow: row, _validationErrors: errors, _isValid: isValidOverall };
    });

    const validAssetsToImport = allValidatedAssets.filter(p => p._isValid);
    const totalRecords = allValidatedAssets.length;
    const createdRecords = validAssetsToImport.length;
    const updatedRecords = 0; // Simulation, no actual update logic
    const failedRecords = totalRecords - createdRecords;

    setImportStats({ total: totalRecords, created: createdRecords, updated: updatedRecords, failed: failedRecords });

    setTimeout(() => { 
      setIsProcessing(false);
      if (createdRecords > 0) {
        console.log("Simulated import of valid assets:", validAssetsToImport.map(({ _originalRow, _validationErrors, _isValid, ...asset }) => asset));
        toast({ title: 'Import Processed (Simulated)', description: `Successfully processed ${createdRecords} assets. ${failedRecords} assets had errors.` });
      } else {
         toast({ title: 'No Valid Assets to Import', description: `No valid assets or all ${totalRecords} had errors.`, variant: 'destructive' });
      }
      setCurrentStep(4);
    }, 1500);
  };

  const resetStepper = () => {
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setFileHeaders([]); setFileData([]); setColumnMapping({}); setPreviewData([]);
    setCurrentStep(1); setIsProcessing(false); setImportStats(null);
    setAssetExtendedMappings([]); setHardwareExtendedMappings([]);
    setCustomSourceHeader(''); setCustomAssetTargetKey(''); setCustomHardwareTargetKey('');
  }

  const hasPreviewData = previewData.length > 0;
  const validPreviewCount = previewData.filter(item => item._isValid).length;
  const invalidPreviewCount = previewData.filter(item => !item._isValid).length;
  const allPreviewItemsValid = hasPreviewData && invalidPreviewCount === 0;

  const unmappedFileHeaders = useMemo(() => {
    return fileHeaders.filter(header => 
        !columnMapping[header] && 
        !assetExtendedMappings.some(m => m.sourceHeader === header) &&
        !hardwareExtendedMappings.some(m => m.sourceHeader === header)
    );
  }, [fileHeaders, columnMapping, assetExtendedMappings, hardwareExtendedMappings]);

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <motion.div key="step1" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <Card>
              <CardHeader><CardTitle>Upload Asset Data File</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                  onClick={handleBrowseClick}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const droppedFile = e.dataTransfer.files[0];
                       if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv') || droppedFile.type === 'application/json' || droppedFile.name.endsWith('.json')) {
                        setFile(droppedFile);
                        toast({ title: 'File Dropped', description: droppedFile.name });
                      } else {
                        toast({ title: 'Invalid File Type', description: 'Please drop a CSV or JSON file.', variant: 'destructive' });
                      }
                    }
                  }}
                >
                  <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">Drag and drop a CSV or JSON file here, or click to browse</p>
                  <Button type="button" variant="default" onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}>
                    <UploadCloud className="mr-2 h-4 w-4" /> BROWSE FILES
                  </Button>
                  <Input type="file" accept=".csv,.json,application/json,text/csv" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                </div>
                {file && <p className="text-sm text-muted-foreground text-center mt-2">Selected file: {file.name}</p>}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Supported formats: CSV (.csv), JSON (.json)</p>
                  <p>Maximum file size: 10MB (example limit)</p>
                </div>
                <Alert variant="default" className="bg-secondary/30">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <AlertTitle className="font-semibold text-foreground">Note</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    For CSV, the file should contain asset data with column headers. For JSON, provide an array of asset objects. In the next step, you will map columns/keys to database fields.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" disabled>BACK</Button>
                <Button onClick={parseFile} disabled={!file || isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  NEXT <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Map Fields from Import File to Database Fields</CardTitle>
                  <CardDescription>Match the columns (CSV) or keys (JSON) from your file to asset fields. Required target fields are marked (*).</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 space-y-4 p-4 border rounded-md bg-secondary/20">
                    <h3 className="text-md font-semibold text-foreground">Import Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="updateExistingRecords" className="text-sm font-medium text-muted-foreground">Update Existing Records</Label>
                        <Select value={updateExisting} onValueChange={setUpdateExisting}>
                          <SelectTrigger id="updateExistingRecords" className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes_update">Yes - Update if record exists</SelectItem>
                            <SelectItem value="no_skip">No - Skip if record exists</SelectItem>
                            <SelectItem value="no_create_new">No - Create new record always</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="errorHandling" className="text-sm font-medium text-muted-foreground">Error Handling</Label>
                        <Select value={errorHandling} onValueChange={setErrorHandling}>
                          <SelectTrigger id="errorHandling" className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_stop">No - Stop import on first error</SelectItem>
                            <SelectItem value="yes_skip">Yes - Skip rows with errors</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="max-h-[400px] w-full overflow-auto border rounded-md">
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead className="w-[25%]">SOURCE FIELD (FILE)</TableHead>
                          <TableHead className="w-[35%]">TARGET FIELD (DATABASE)</TableHead>
                          <TableHead className="w-[15%]">DATA TYPE</TableHead>
                          <TableHead className="w-[15%]">REQUIRED</TableHead>
                          <TableHead className="w-[10%] text-center">ACTIONS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileHeaders.length > 0 ? fileHeaders.map(fileHeaderKey => (
                          <TableRow key={fileHeaderKey}>
                            <TableCell className="font-medium py-3">{fileHeaderKey}</TableCell>
                            <TableCell className="py-2">
                              <Select value={columnMapping[fileHeaderKey] || ''} onValueChange={(value) => handleMappingChange(fileHeaderKey, value === 'none' ? null : value)}>
                                <SelectTrigger id={`map-${fileHeaderKey}`}><SelectValue placeholder="-- Do Not Import --" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Do Not Import --</SelectItem>
                                  {ASSET_FIELDS_TO_MAP.map(assetField => (
                                    <SelectItem key={assetField} value={assetField}>
                                      {getFieldLabel(assetField)}
                                      {REQUIRED_ASSET_FIELDS.includes(assetField) && <span className="text-destructive ml-1">*</span>}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-muted-foreground py-3">String</TableCell>
                            <TableCell className="text-muted-foreground py-3">
                              {columnMapping[fileHeaderKey] && REQUIRED_ASSET_FIELDS.includes(columnMapping[fileHeaderKey]!) ? <span className="text-destructive font-semibold">Yes</span> : 'No'}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleMappingChange(fileHeaderKey, null)} title="Clear mapping"><XIcon size={16} /></Button>
                            </TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No file headers found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <Alert variant="default" className="mt-6 bg-secondary/30">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <AlertTitle className="font-semibold text-foreground">Mapping Complex Data</AlertTitle>
                      <AlertDescription className="text-muted-foreground">For arrays (e.g., Tags) use comma-separated strings in your source file. For nested objects, ensure your source keys match the dot-notation target fields (e.g., 'hardware.vendor'). You can also map to custom extended fields below.</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Custom Mapping for Asset.extended */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Map to Asset's Extended Properties</CardTitle>
                  <CardDescription>Define custom mappings for fields that will be stored under `asset.extended`.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                      <Label htmlFor="customSourceHeaderAsset">Source Header from File</Label>
                       <Select value={customSourceHeader} onValueChange={setCustomSourceHeader}>
                        <SelectTrigger id="customSourceHeaderAsset"><SelectValue placeholder="Select source header..." /></SelectTrigger>
                        <SelectContent>
                          {unmappedFileHeaders.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                          {fileHeaders.filter(h => !unmappedFileHeaders.includes(h) && !assetExtendedMappings.some(m => m.sourceHeader === h) && !hardwareExtendedMappings.some(m => m.sourceHeader === h)).map(header => <SelectItem key={header} value={header} disabled>{header} (mapped)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <Label htmlFor="customAssetTargetKey">Target Key in `asset.extended`</Label>
                      <Input id="customAssetTargetKey" placeholder="e.g., legacySystemId" value={customAssetTargetKey} onChange={(e) => setCustomAssetTargetKey(e.target.value)} />
                    </div>
                    <Button onClick={() => handleAddCustomMapping('asset')} className="self-end" disabled={!customSourceHeader || !customAssetTargetKey}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Asset Extended Mapping
                    </Button>
                  </div>
                  {assetExtendedMappings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-sm">Current Asset Extended Mappings:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {assetExtendedMappings.map(m => (
                          <li key={m.id} className="flex justify-between items-center">
                            <span>"{m.sourceHeader}" <ChevronRight size={12} className="inline mx-1"/> `extended.{m.targetKey}`</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCustomMapping(m.id, 'asset')}><Trash2 size={14} /></Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Mapping for Asset.hardware.extended */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Map to Hardware's Extended Properties</CardTitle>
                  <CardDescription>Define custom mappings for fields under `asset.hardware.extended`.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                      <Label htmlFor="customSourceHeaderHardware">Source Header from File</Label>
                      <Select value={customSourceHeader} onValueChange={setCustomSourceHeader}>
                        <SelectTrigger id="customSourceHeaderHardware"><SelectValue placeholder="Select source header..." /></SelectTrigger>
                        <SelectContent>
                          {unmappedFileHeaders.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                          {fileHeaders.filter(h => !unmappedFileHeaders.includes(h) && !assetExtendedMappings.some(m => m.sourceHeader === h) && !hardwareExtendedMappings.some(m => m.sourceHeader === h)).map(header => <SelectItem key={header} value={header} disabled>{header} (mapped)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <Label htmlFor="customHardwareTargetKey">Target Key in `hardware.extended`</Label>
                      <Input id="customHardwareTargetKey" placeholder="e.g., psuModel" value={customHardwareTargetKey} onChange={(e) => setCustomHardwareTargetKey(e.target.value)} />
                    </div>
                    <Button onClick={() => handleAddCustomMapping('hardware')} className="self-end" disabled={!customSourceHeader || !customHardwareTargetKey}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Hardware Extended Mapping
                    </Button>
                  </div>
                  {hardwareExtendedMappings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-sm">Current Hardware Extended Mappings:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {hardwareExtendedMappings.map(m => (
                          <li key={m.id} className="flex justify-between items-center">
                            <span>"{m.sourceHeader}" <ChevronRight size={12} className="inline mx-1"/> `hardware.extended.{m.targetKey}`</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCustomMapping(m.id, 'hardware')}><Trash2 size={14} /></Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>


              <CardFooter className="justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isProcessing}><ChevronLeft className="mr-2 h-4 w-4" /> BACK</Button>
                <Button onClick={generatePreview} disabled={isProcessing || fileData.length === 0 || (Object.values(columnMapping).every(v => v === null) && assetExtendedMappings.length === 0 && hardwareExtendedMappings.length === 0) }>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  PREVIEW & VALIDATE <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </div>
          </motion.div>
        );
      case 3: // Validate Data
        return (
          <motion.div key="step3" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Eye className="mr-2 h-6 w-6 text-primary"/>Validate Import Data</CardTitle>
                <CardDescription>Review validation of previewed data (first 10 rows). Rows with errors will be skipped if 'Skip rows with errors' is chosen, otherwise import may stop.</CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing ? (<div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Validating...</p></div>
                ) : !hasPreviewData && fileData.length > 0 ? (
                    <Alert variant="default"><AlertCircle className="h-4 w-4" /><AlertTitle>No Preview Data</AlertTitle><AlertDescription>Could not generate preview. Check mappings or file structure.</AlertDescription></Alert>
                ) : !hasPreviewData && fileData.length === 0 ? (
                     <Alert variant="default"><AlertCircle className="h-4 w-4" /><AlertTitle>No Data Uploaded</AlertTitle><AlertDescription>Please upload a file with data.</AlertDescription></Alert>
                ) : allPreviewItemsValid ? (
                  <div className="space-y-6">
                    <div className="flex items-start space-x-3 rounded-md border border-green-300 bg-green-50 p-4 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-500 dark:text-green-400" />
                      <div><p className="font-semibold">Validation Successful</p><p className="text-sm">No validation errors in previewed data. Ready for import.</p></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">Validation Summary</h3>
                      <div className="flex items-center space-x-2 text-green-700 dark:text-green-400"><CheckCircle className="h-5 w-5" /><p className="font-medium">All {validPreviewCount} previewed record(s) are valid.</p></div>
                      <p className="text-sm text-muted-foreground mt-1">Click 'IMPORT' to process all {fileData.length} records (simulation).</p>
                    </div>
                  </div>
                ) : ( // hasPreviewData && invalidPreviewCount > 0
                  <div className="space-y-4">
                    <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Validation Issues Found</AlertTitle><AlertDescription>{invalidPreviewCount} of {previewData.length} previewed records have errors. Review below.</AlertDescription></Alert>
                    <ScrollArea className="h-[400px] border rounded-md">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow>
                            <TableHead className="w-12">Status</TableHead>
                            {fileHeaders.filter(fh => columnMapping[fh] || assetExtendedMappings.some(m => m.sourceHeader === fh) || hardwareExtendedMappings.some(m => m.sourceHeader === fh) ).map(fh => {
                              let label = fh;
                              if (columnMapping[fh]) label = getFieldLabel(columnMapping[fh]!);
                              else if (assetExtendedMappings.some(m => m.sourceHeader === fh)) label = `Ext: ${assetExtendedMappings.find(m=>m.sourceHeader === fh)!.targetKey}`;
                              else if (hardwareExtendedMappings.some(m => m.sourceHeader === fh)) label = `HW Ext: ${hardwareExtendedMappings.find(m=>m.sourceHeader === fh)!.targetKey}`;
                              return (<TableHead key={fh}>{label}</TableHead>);
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((item, index) => (
                            <TableRow key={index} className={!item._isValid ? 'bg-destructive/10 hover:bg-destructive/20' : 'hover:bg-muted/50'}>
                              <TableCell className="py-3">
                                {item._isValid ? <CheckCircle className="h-5 w-5 text-green-500" /> : (
                                  <TooltipProvider><Tooltip><TooltipTrigger asChild><AlertCircle className="h-5 w-5 text-destructive cursor-help" /></TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-destructive text-destructive-foreground p-2 rounded-md shadow-lg" side="right">
                                      <ul className="list-disc pl-4 text-xs space-y-1">
                                        {Object.entries(item._validationErrors).map(([key,errMsg]) => {
                                           let errorFieldLabel = key;
                                           if(columnMapping[key]) errorFieldLabel = getFieldLabel(columnMapping[key]!);
                                           else if (key.startsWith('_unmapped_or_empty_')) errorFieldLabel = getFieldLabel(key.replace('_unmapped_or_empty_',''));
                                           else if (key.startsWith('_empty_')) errorFieldLabel = getFieldLabel(key.replace('_empty_',''));
                                           else if (key.startsWith('_final_check_')) errorFieldLabel = getFieldLabel(key.replace('_final_check_',''));

                                           return (<li key={key}><strong>{errorFieldLabel}:</strong> {String(errMsg)}</li>)
                                        })}
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip></TooltipProvider>
                                )}
                              </TableCell>
                              {fileHeaders.filter(fh => columnMapping[fh] || assetExtendedMappings.some(m => m.sourceHeader === fh) || hardwareExtendedMappings.some(m => m.sourceHeader === fh)).map(fileHeaderKey => {
                                const originalValue = item._originalRow[fileHeaderKey];
                                let displayValue: any = originalValue;
                                if (typeof displayValue === 'object' && displayValue !== null) { displayValue = JSON.stringify(displayValue); } 
                                else if (typeof displayValue === 'boolean') { displayValue = displayValue ? 'True' : 'False'; }
                                
                                let cellError = item._validationErrors[fileHeaderKey]; // Check for direct error on this source header
                                if(!cellError && columnMapping[fileHeaderKey]) { // if no direct error, check if there's an error on the mapped target field
                                   if(item._validationErrors[`_empty_${columnMapping[fileHeaderKey]!}`]) cellError = item._validationErrors[`_empty_${columnMapping[fileHeaderKey]!}`];
                                }


                                return (<TableCell key={fileHeaderKey} className="py-3 text-sm"><div className={cn(cellError ? 'text-destructive' : '')}>{displayValue !== undefined && displayValue !== null ? String(displayValue) : <span className="italic text-muted-foreground">empty</span>}</div>{cellError && (<span className="text-xs text-destructive block mt-0.5">{String(cellError)}</span>)}</TableCell>);
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isProcessing}><ChevronLeft className="mr-2 h-4 w-4" /> BACK</Button>
                <Button onClick={handleImport} disabled={isProcessing || !hasPreviewData || (errorHandling === "no_stop" && invalidPreviewCount > 0 && fileData.length > 0)}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} IMPORT
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        );
      case 4: // Import Results
        return (
          <motion.div key="step4" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
            <Card>
              <CardHeader><CardTitle className="flex items-center"><CheckCircle className="mr-2 h-6 w-6 text-green-500"/>Import Results</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {isProcessing && !importStats && (<div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Finalizing...</p></div>)}
                {importStats && (
                  <>
                    <div className={cn("flex items-start space-x-3 rounded-md border p-4", importStats.failed > 0 && importStats.created === 0 ? "border-destructive/50 bg-destructive/10 text-destructive" : importStats.failed > 0 ? "border-yellow-400/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "border-green-300 bg-green-50 p-4 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400")}>
                      {importStats.failed > 0 && importStats.created === 0 ? <AlertCircle className="h-6 w-6 flex-shrink-0" /> : <CheckCircle className="h-6 w-6 flex-shrink-0" />}
                      <div>
                        <p className="font-semibold">{importStats.failed > 0 && importStats.created === 0 ? "Import Failed" : importStats.failed > 0 ? "Import Completed with Issues" : "Import Completed Successfully"}</p>
                        <p className="text-sm">{importStats.created > 0 && `Successfully imported ${importStats.created} out of ${importStats.total} records. `}{importStats.failed > 0 && `${importStats.failed} record(s) failed. `}(Success rate: {importStats.total > 0 ? ((importStats.created / importStats.total) * 100).toFixed(1) : '0.0'}%)</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-foreground">Import Summary</h3>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <StatBlock title="Total Records" value={importStats.total} bgColor="bg-card border" textColor="text-foreground" />
                        <StatBlock title="Created" value={importStats.created} bgColor="bg-green-500" textColor="text-white" icon={<CheckCircle size={18} />} />
                        <StatBlock title="Updated" value={importStats.updated} bgColor="bg-primary" textColor="text-primary-foreground" icon={<ListChecks size={18} />} />
                        <StatBlock title="Failed" value={importStats.failed} bgColor="bg-destructive" textColor="text-destructive-foreground" icon={<XIcon size={18} />} />
                      </div>
                    </div>
                  </>
                )}
                {!isProcessing && !importStats && (<p className="text-muted-foreground">No import results. Please start an import.</p>)}
              </CardContent>
              <CardFooter className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto" disabled={isProcessing}><ChevronLeft className="mr-2 h-4 w-4" /> BACK</Button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button variant="outline" asChild className="w-full sm:w-auto" disabled={isProcessing}><Link href="/assets"><ListChecks className="mr-2 h-4 w-4" /> VIEW ASSETS</Link></Button>
                  <Button onClick={resetStepper} className="w-full sm:w-auto" disabled={isProcessing}><FileUp className="mr-2 h-4 w-4" /> START NEW IMPORT</Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        );
      default: return null;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between mb-10">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <StepperStep stepNumber={step.number} title={step.title} isActive={currentStep === step.number} isCompleted={currentStep > step.number} />
            {index < steps.length - 1 && <StepperConnector isCompleted={currentStep > step.number + 1} isActive={currentStep === step.number + 1 && currentStep > step.number} />}
          </React.Fragment>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {renderStepContent()}
      </AnimatePresence>
    </div>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

    
