
// src/components/assets/bulk-import-stepper.tsx
"use client";

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileUp, Loader2, ListChecks, Eye, UploadCloud, Check, X as XIcon } from 'lucide-react';
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

type DataRow = Record<string, any>;
type ColumnMapping = Record<string, string | null>; // CSV/JSON Header -> AssetFieldKey

const ASSET_FIELDS_TO_MAP: string[] = [
  'deviceId', 'name', 'description', 'documentation',
  'installationDate', 'manufactureDate', 'stage', 'lifecycle',
  'serialNumber', 'last_seen', 'zone', 'release', 'modified',
  'exposure', 'os_firmware', 'last_seen_by', 'last_patch_date',
  'days_since_last_patch', 'assignedUser', 'department',
  'cpu', 'ram', 'storage', 'imageUrl', 'purchaseCost',
  'currentValue', 'retirementDate', 'tags', // tags should be comma-separated in source
  'hardware.vendor', 'hardware.model', 'hardware.type', 'hardware.category', 'hardware.version', 'hardware.endOfLife', 'hardware.orderNumber', 'hardware.vendorLink', 'hardware.description', 'hardware.ref',
  'hardware.extended.MTBF', 'hardware.extended.powerConsumption',
  'context.location.name', 'context.location.locationId', 'context.location.ref',
  'context.referenceLocation.name', 'context.referenceLocation.locationId', 'context.referenceLocation.ref',
  'context.otSystem.name', 'context.otSystem.id', 'context.deviceGroup',
  'context.businessProcesses[0].name', 'context.businessProcesses[0].criticality', 'context.businessProcesses[0].role', 'context.businessProcesses[0].ref', // Example for first item in array
  'warranty.startDate', 'warranty.endDate', 'warranty.provider', 'warranty.terms',
  'criticality.rating', 'criticality.impact', 'criticality.businessCriticality',
  'safety.certification', 'safety.level', 'safety.lastAssessment',
  'security.authenticationMethod', 'security.encryptionEnabled', 'security.securityScore', 'security.lastSecurityAssessment',
  // Arrays like vulnerabilities, securityControls, connections would need more complex mapping logic if imported directly from flat files.
  // For simplicity, we might expect them as stringified JSON or handle them with special post-processing.
  // 'security.vulnerabilities[0].ref',
  // 'security.securityControls[0].ref',
  // 'connections[0].network', 'connections[0].L3Address', 'connections[0].L2Address',
  'digitalTwin.ref', 'digitalTwin.lastSynced',
  'maintenance.schedule.frequency', 'maintenance.schedule.nextScheduled', 'maintenance.schedule.lastPerformed',
  // 'maintenance.records[0].ref',
  // 'behavior.normalPatterns[0].type',
  'behavior.anomalyDetection.enabled', 'behavior.anomalyDetection.sensitivity', 'behavior.anomalyDetection.lastAnomaly',
  'riskAssessment.overallRisk', 'riskAssessment.impactToBusinessProcesses', 'riskAssessment.threatLevel', 'riskAssessment.lastAssessed',
  'extended.customField1', 'extended.customField2', // Top-level extended fields
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
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
        isActive ? "bg-primary text-primary-foreground border-primary" :
        isCompleted ? "bg-green-500 text-white border-green-500" :
        "bg-muted text-muted-foreground border-border"
      )}
    >
      {isCompleted && !isActive ? <Check size={16} /> : stepNumber}
    </div>
    <p className={cn("mt-1 text-xs text-center", isActive ? "text-primary font-semibold" : "text-muted-foreground")}>{title}</p>
  </div>
);

const StepperConnector: React.FC<{isCompleted?: boolean; isActive?:boolean}> = ({isCompleted, isActive}) => (
   <div className={cn("flex-1 border-b-2 self-start mt-4", (isCompleted || isActive) ? "border-primary" : "border-border")} />
);

const getFieldLabel = (fieldKey: string): string => {
  if (!fieldKey) return "N/A";
  const overrides: Record<string, string> = {
    'deviceId': "Device ID", 'name': "Asset Name", 'os_firmware': "OS / Firmware", 'last_seen': "Last Seen",
    'hardware.vendor': "Hardware Vendor", 'hardware.model': "Hardware Model", 'hardware.type': "Hardware Type",
    'hardware.category': "Hardware Category", 'hardware.version': "Hardware Version", 'hardware.endOfLife': "HW End of Life",
    'hardware.orderNumber': "HW Order Number", 'hardware.vendorLink': "HW Vendor Link", 'hardware.description': "HW Description", 'hardware.ref': "HW Ref",
    'hardware.extended.MTBF': "HW MTBF (Years)", 'hardware.extended.powerConsumption': "HW Power Consumption",
    'context.location.name': "Location Name", 'context.location.locationId': "Location ID", 'context.location.ref': "Location Ref",
    'context.referenceLocation.name': "Ref Location Name", 'context.referenceLocation.locationId': "Ref Location ID", 'context.referenceLocation.ref': "Ref Location Ref",
    'context.otSystem.name': "OT System Name", 'context.otSystem.id': "OT System ID", 'context.deviceGroup': "Device Group",
    'context.businessProcesses[0].name': "Business Process 1 Name", 'context.businessProcesses[0].criticality': "BP1 Criticality", 'context.businessProcesses[0].role': "BP1 Role", 'context.businessProcesses[0].ref': "BP1 Ref",
    'warranty.startDate': "Warranty Start", 'warranty.endDate': "Warranty End", 'warranty.provider': "Warranty Provider", 'warranty.terms': "Warranty Terms",
    'criticality.rating': "Criticality Rating", 'criticality.impact': "Impact Score", 'criticality.businessCriticality': "Business Criticality Score",
    'safety.certification': "Safety Certification", 'safety.level': "Safety Level (SIL)", 'safety.lastAssessment': "Last Safety Assessment",
    'security.authenticationMethod': "Auth Method", 'security.encryptionEnabled': "Encryption Enabled", 'security.securityScore': "Security Score", 'security.lastSecurityAssessment': "Last Security Assessment",
    'digitalTwin.ref': "Digital Twin Ref", 'digitalTwin.lastSynced': "Digital Twin Synced",
    'maintenance.schedule.frequency': "Maint. Frequency", 'maintenance.schedule.nextScheduled': "Next Maint.", 'maintenance.schedule.lastPerformed': "Last Maint.",
    'behavior.anomalyDetection.enabled': "Anomaly Detection On", 'behavior.anomalyDetection.sensitivity': "Anomaly Sensitivity", 'behavior.anomalyDetection.lastAnomaly': "Last Anomaly",
    'riskAssessment.overallRisk': "Overall Risk Score", 'riskAssessment.impactToBusinessProcesses': "Risk Impact to BP", 'riskAssessment.threatLevel': "Threat Level", 'riskAssessment.lastAssessed': "Last Risk Assessment",
    'extended.customField1': "Custom Field 1", 'extended.customField2': "Custom Field 2",
    'tags': 'Tags (comma-separated in source)',
  };
  if (overrides[fieldKey]) return overrides[fieldKey];

  // Generic label for dot notation if not overridden
  return fieldKey.split('.').map(part =>
    part.replace(/([A-Z0-9])/g, ' $1') // Add space before capitals/numbers
        .replace(/\[(\d+)\]/g, ' $1') // Handle array indices like [0] -> 0
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
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
  <div className={cn("p-4 rounded-lg shadow flex flex-col items-center justify-center text-center h-28", bgColor, textColor)}>
    {icon && <div className="mb-1">{icon}</div>}
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs">{title}</p>
  </div>
);


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

    const processParsedData = (data: DataRow[], headers: string[]) => {
        setFileHeaders(headers);
        setFileData(data);
        // Auto-map attempt
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

  // Helper to set nested properties in an object
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

      if (index === keys.length - 1) { // Last key in path
        if (arrayIndex !== undefined) {
          if (!current[actualKey] || !Array.isArray(current[actualKey])) {
            current[actualKey] = [];
          }
          current[actualKey][arrayIndex] = value;
        } else {
          current[actualKey] = value;
        }
      } else { // Not the last key, ensure object/array structure
        if (arrayIndex !== undefined) {
          if (!current[actualKey] || !Array.isArray(current[actualKey])) {
            current[actualKey] = [];
          }
          if (!current[actualKey][arrayIndex]) {
            current[actualKey][arrayIndex] = {};
          }
          current = current[actualKey][arrayIndex];
        } else {
          if (!current[actualKey] || typeof current[actualKey] !== 'object') {
            current[actualKey] = {};
          }
          current = current[actualKey];
        }
      }
    });
  };

  const generatePreview = () => {
    setIsProcessing(true);
    setPreviewData([]);
    const validated: ValidatedAsset[] = fileData.slice(0, 10).map(row => {
      const asset: Partial<Asset> = {};
      const errors: Record<string, string> = {};
      let isValidOverall = true;

      fileHeaders.forEach(fileHeaderKey => {
        const assetFieldKey = columnMapping[fileHeaderKey];
        const originalValue = row[fileHeaderKey];

        if (assetFieldKey) { // If this column is mapped
          if (originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
            let convertedValue: any = originalValue;
            
            // Basic type conversions / special handling
            if (assetFieldKey === 'tags' && typeof originalValue === 'string') {
              convertedValue = originalValue.split(',').map(tag => tag.trim()).filter(tag => tag);
            } else if (['purchaseCost', 'currentValue', 'criticality.impact', 'criticality.businessCriticality', 'security.securityScore', 'days_since_last_patch', 'riskAssessment.overallRisk', 'hardware.extended.MTBF'].includes(assetFieldKey)) {
              const num = parseFloat(String(originalValue));
              if (isNaN(num)) {
                errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be a number. Got: ${originalValue}`;
                isValidOverall = false;
              } else {
                convertedValue = num;
              }
            } else if (['security.encryptionEnabled', 'behavior.anomalyDetection.enabled'].includes(assetFieldKey)) {
              if (String(originalValue).toLowerCase() === 'true') convertedValue = true;
              else if (String(originalValue).toLowerCase() === 'false') convertedValue = false;
              else {
                errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be true/false. Got: ${originalValue}`;
                isValidOverall = false;
              }
            } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate', 'hardware.endOfLife', 'warranty.startDate', 'warranty.endDate', 'safety.lastAssessment', 'security.lastSecurityAssessment', 'digitalTwin.lastSynced', 'maintenance.schedule.nextScheduled', 'maintenance.schedule.lastPerformed', 'behavior.anomalyDetection.lastAnomaly', 'riskAssessment.lastAssessed'].includes(assetFieldKey)) {
              if (originalValue) {
                const date = new Date(String(originalValue));
                if (isNaN(date.getTime())) {
                  errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} is not a valid date. Got: ${originalValue}`;
                  isValidOverall = false;
                } else {
                  convertedValue = date.toISOString();
                }
              }
            }
            // TODO: Add more specific validations as needed
            if (assetFieldKey === 'hardware.type' && typeof convertedValue === 'string' && !ASSET_TYPE_VALUES_EXAMPLE.includes(convertedValue)) {
              // errors[fileHeaderKey] = `Invalid type: ${convertedValue}. Not in example list.`; // Example validation
              // isValidOverall = false; // Can be relaxed if type isn't strict
            } else if (assetFieldKey === 'stage' && typeof convertedValue === 'string' && !ASSET_STAGE_VALUES_EXAMPLE.includes(convertedValue)) {
              // errors[fileHeaderKey] = `Invalid stage: ${convertedValue}. Not in example list.`;
              // isValidOverall = false;
            }
            
            if(isValidOverall || errors[fileHeaderKey] === undefined) { // Only set if no conversion error
                setNestedProperty(asset, assetFieldKey, convertedValue);
            }

          } else if (REQUIRED_ASSET_FIELDS.includes(assetFieldKey)) {
            errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} is required but has no value.`;
            isValidOverall = false;
          }
        }
      });
      
      REQUIRED_ASSET_FIELDS.forEach(requiredAssetField => {
        // Check if a mapped source column *targeting* this required field actually has a value.
        // This is complex if multiple source columns could map to the same target.
        // For now, simpler: if it's not targeted by any mapping, it's an error.
        if (!Object.values(columnMapping).includes(requiredAssetField)) {
             errors[`_unmapped_${requiredAssetField}`] = `${getFieldLabel(requiredAssetField)} is required but not mapped.`;
             isValidOverall = false;
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
      const asset: Partial<Asset> = {};
      let isValidOverall = true;
      const errors: Record<string, string> = {}; // For full validation, though not displayed in step 4 summary

      fileHeaders.forEach(fileHeaderKey => {
        const assetFieldKey = columnMapping[fileHeaderKey];
        const originalValue = row[fileHeaderKey];
        if (assetFieldKey && originalValue !== undefined && originalValue !== null && String(originalValue).trim() !== "") {
          let convertedValue: any = originalValue;
          // Basic conversions (could be refactored into a helper)
          if (assetFieldKey === 'tags' && typeof originalValue === 'string') {
              convertedValue = originalValue.split(',').map(tag => tag.trim()).filter(tag => tag);
          } else if (['purchaseCost', 'currentValue', 'criticality.impact', /* ...other numeric fields */].includes(assetFieldKey)) {
              const num = parseFloat(String(originalValue));
              if (isNaN(num)) isValidOverall = false; else convertedValue = num;
          } else if (['installationDate', /* ...other date fields */].includes(assetFieldKey)) {
              const date = new Date(String(originalValue));
              if (isNaN(date.getTime())) isValidOverall = false; else convertedValue = date.toISOString();
          }
          
          if (isValidOverall) setNestedProperty(asset, assetFieldKey, convertedValue);

        } else if (assetFieldKey && REQUIRED_ASSET_FIELDS.includes(assetFieldKey)) {
            isValidOverall = false; // Missing required field
        }
      });
      REQUIRED_ASSET_FIELDS.forEach(requiredAssetField => {
        if (!Object.values(columnMapping).includes(requiredAssetField)) {
             isValidOverall = false; // Required field not mapped
        }
      });
      return { ...asset, _originalRow: row, _validationErrors: errors, _isValid: isValidOverall };
    });

    const validAssetsToImport = allValidatedAssets.filter(p => p._isValid);
    const totalRecords = allValidatedAssets.length;
    const createdRecords = validAssetsToImport.length; // Assuming all valid are "created" for now
    const updatedRecords = 0; // Not implemented yet
    const failedRecords = totalRecords - createdRecords;

    setImportStats({
      total: totalRecords,
      created: createdRecords,
      updated: updatedRecords,
      failed: failedRecords,
    });

    setTimeout(() => { 
      setIsProcessing(false);
      if (createdRecords > 0) {
        console.log("Simulated import of valid assets:", validAssetsToImport.map(({ _originalRow, _validationErrors, _isValid, ...asset }) => asset));
        toast({
          title: 'Import Processed (Simulated)',
          description: `Successfully processed ${createdRecords} assets. ${failedRecords} assets had errors.`,
        });
      } else {
         toast({
          title: 'No Valid Assets to Import',
          description: `No valid assets found or all ${totalRecords} assets had errors.`,
          variant: 'destructive'
        });
      }
      setCurrentStep(4);
    }, 1500);
  };

  const resetStepper = () => {
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setFileHeaders([]);
    setFileData([]);
    setColumnMapping({} as ColumnMapping);
    setPreviewData([]);
    setCurrentStep(1);
    setIsProcessing(false);
    setImportStats(null);
  }

  const hasPreviewData = previewData.length > 0;
  const validPreviewCount = previewData.filter(item => item._isValid).length;
  const invalidPreviewCount = previewData.filter(item => !item._isValid).length;
  const allPreviewItemsValid = hasPreviewData && invalidPreviewCount === 0;


  return (
    <div className="space-y-8">
      <div className="flex justify-between mb-10">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <StepperStep
              stepNumber={step.number}
              title={step.title}
              isActive={currentStep === step.number}
              isCompleted={currentStep > step.number}
            />
            {index < steps.length - 1 && <StepperConnector isCompleted={currentStep > step.number + 1} isActive={currentStep === step.number + 1 && currentStep > step.number} />}
          </React.Fragment>
        ))}
      </div>

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Asset Data File</CardTitle>
          </CardHeader>
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
              <p className="text-muted-foreground mb-2">Drag and drop a file here or click to browse</p>
              <Button type="button" variant="default" onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}>
                <UploadCloud className="mr-2 h-4 w-4" /> BROWSE FILES
              </Button>
              <Input
                type="file"
                accept=".csv,.json,application/json,text/csv"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
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
            <Button variant="outline" onClick={() => {/* No back action */}} disabled>
              BACK
            </Button>
            <Button onClick={parseFile} disabled={!file || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              NEXT <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Map Fields from Import File to Database Fields</CardTitle>
            <CardDescription>Match the columns (from CSV) or keys (from JSON) from your file to the corresponding asset fields. Required target fields are marked (*).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-4 p-4 border rounded-md bg-secondary/20">
              <h3 className="text-md font-semibold text-foreground">Import Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="updateExistingRecords" className="text-sm font-medium text-muted-foreground">Update Existing Records</Label>
                  <Select value={updateExisting} onValueChange={setUpdateExisting}>
                    <SelectTrigger id="updateExistingRecords" className="mt-1">
                      <SelectValue placeholder="Select option..." />
                    </SelectTrigger>
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
                    <SelectTrigger id="errorHandling" className="mt-1">
                      <SelectValue placeholder="Select option..." />
                    </SelectTrigger>
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
                        <Select
                          value={columnMapping[fileHeaderKey] || ''}
                          onValueChange={(value) => handleMappingChange(fileHeaderKey, value === 'none' ? null : value)}
                        >
                          <SelectTrigger id={`map-${fileHeaderKey}`}>
                            <SelectValue placeholder="-- Do Not Import --" />
                          </SelectTrigger>
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
                        {columnMapping[fileHeaderKey] && REQUIRED_ASSET_FIELDS.includes(columnMapping[fileHeaderKey]!)
                          ? <span className="text-destructive font-semibold">Yes</span>
                          : 'No'}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleMappingChange(fileHeaderKey, null)} title="Clear mapping">
                          <XIcon size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No file headers found or file not parsed yet.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            <Alert variant="default" className="mt-6 bg-secondary/30">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="font-semibold text-foreground">Mapping Complex Data</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  For arrays (e.g., Tags) use comma-separated strings in your source file. For nested objects, ensure your source keys match the dot-notation target fields (e.g., 'hardware.vendor').
                </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
            <Button onClick={generatePreview} disabled={isProcessing || fileData.length === 0 || Object.values(columnMapping).every(v => v === null)}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              PREVIEW & VALIDATE <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="mr-2 h-6 w-6 text-primary"/>Validate Import Data
            </CardTitle>
            <CardDescription>Review the validation status of your import data preview. Only the first 10 rows are shown for preview.</CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Validating data...</p>
              </div>
            ) : !hasPreviewData && fileData.length > 0 ? (
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Preview Data</AlertTitle>
                    <AlertDescription>
                     Could not generate preview. Check field mappings for required fields or file structure. Ensure data rows exist in your file.
                    </AlertDescription>
                </Alert>
            ) : !hasPreviewData && fileData.length === 0 ? (
                 <Alert variant="default">
                    <AlertCircle className="h-4 w-4" /> {/* Changed to AlertCircle for consistency */}
                    <AlertTitle>No Data Uploaded</AlertTitle>
                    <AlertDescription>
                     The uploaded file seems to be empty or could not be parsed. Please go back and upload a file with data.
                    </AlertDescription>
                </Alert>
            ) : allPreviewItemsValid ? (
              <div className="space-y-6">
                <div className="flex items-start space-x-3 rounded-md border border-green-300 bg-green-50 p-4 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-500 dark:text-green-400" />
                  <div>
                    <p className="font-semibold">Validation Successful</p>
                    <p className="text-sm">No validation errors found in the previewed data. The data is ready to be imported.</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Validation Summary</h3>
                  <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">All {validPreviewCount} previewed record(s) are valid.</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click 'IMPORT' to proceed with importing all {fileData.length} records from the file into the database (simulation).
                  </p>
                </div>
              </div>
            ) : ( // hasPreviewData && invalidPreviewCount > 0
              <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Issues Found</AlertTitle>
                    <AlertDescription>
                    {invalidPreviewCount} of {previewData.length} previewed records have errors. Please review the table below. 
                    Rows with errors will be skipped if you proceed with the import and 'Skip rows with errors' option is selected.
                    Otherwise, the import may stop.
                    </AlertDescription>
                </Alert>
                <ScrollArea className="h-[400px] border rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        {fileHeaders.filter(fh => columnMapping[fh]).map(fh => (
                          <TableHead key={fh}>{getFieldLabel(columnMapping[fh]!)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((item, index) => (
                        <TableRow key={index} className={!item._isValid ? 'bg-destructive/10 hover:bg-destructive/20' : 'hover:bg-muted/50'}>
                          <TableCell className="py-3">
                            {item._isValid ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-5 w-5 text-destructive cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs bg-destructive text-destructive-foreground p-2 rounded-md shadow-lg" side="right">
                                    <ul className="list-disc pl-4 text-xs space-y-1">
                                      {Object.entries(item._validationErrors).map(([key,errMsg]) => (
                                        <li key={key}><strong>{key.startsWith('_unmapped_') ? getFieldLabel(key.replace('_unmapped_','')) : getFieldLabel(columnMapping[key] || key) || key}:</strong> {String(errMsg)}</li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          {fileHeaders.filter(fh => columnMapping[fh]).map(fileHeaderKey => {
                            const assetFieldKey = columnMapping[fileHeaderKey]!;
                            const keys = assetFieldKey.split('.');
                            let displayValue = item as any;
                            try {
                                for (const key of keys) {
                                    const arrayMatch = key.match(/^(.*)\[(\d+)\]$/);
                                    if (arrayMatch) {
                                        displayValue = displayValue?.[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
                                    } else {
                                        displayValue = displayValue?.[key];
                                    }
                                    if (displayValue === undefined) break;
                                }
                            } catch (e) { displayValue = undefined; }

                            if (typeof displayValue === 'object' && displayValue !== null) {
                                displayValue = JSON.stringify(displayValue);
                            } else if (typeof displayValue === 'boolean') {
                                displayValue = displayValue ? 'True' : 'False';
                            }

                            return (
                              <TableCell key={fileHeaderKey} className="py-3 text-sm">
                                <div className={cn(item._validationErrors[fileHeaderKey] ? 'text-destructive' : '')}>
                                  {displayValue !== undefined && displayValue !== null ? String(displayValue) : <span className="italic text-muted-foreground">empty</span>}
                                </div>
                                {item._validationErrors[fileHeaderKey] && (
                                    <span className="text-xs text-destructive block mt-0.5">{item._validationErrors[fileHeaderKey]}</span>
                                )}
                              </TableCell>
                            );
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
            <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isProcessing || !hasPreviewData || (errorHandling === "no_stop" && invalidPreviewCount > 0 && fileData.length > 0)}
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              IMPORT
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-6 w-6 text-green-500"/>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProcessing && !importStats && (
                <div className="flex items-center justify-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Finalizing import...</p>
                </div>
            )}
            {importStats && (
              <>
                <div className={cn(
                  "flex items-start space-x-3 rounded-md border p-4",
                  importStats.failed > 0 && importStats.created === 0 ? "border-destructive/50 bg-destructive/10 text-destructive" :
                  importStats.failed > 0 ? "border-yellow-400/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" :
                  "border-green-300 bg-green-50 p-4 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400"
                )}>
                  {importStats.failed > 0 && importStats.created === 0 ? <AlertCircle className="h-6 w-6 flex-shrink-0" /> : <CheckCircle className="h-6 w-6 flex-shrink-0" />}
                  <div>
                    <p className="font-semibold">
                      {importStats.failed > 0 && importStats.created === 0 ? "Import Failed" : 
                       importStats.failed > 0 ? "Import Completed with Issues" : 
                       "Import Completed Successfully"}
                    </p>
                    <p className="text-sm">
                      {importStats.created > 0 && `Successfully imported ${importStats.created} out of ${importStats.total} records. `}
                      {importStats.failed > 0 && `${importStats.failed} record(s) failed. `}
                      (Success rate: {importStats.total > 0 ? ((importStats.created / importStats.total) * 100).toFixed(1) : '0.0'}%)
                    </p>
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
            {!isProcessing && !importStats && (
                 <p className="text-muted-foreground">No import results to display. Please start an import.</p>
            )}
          </CardContent>
          <CardFooter className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto" disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button variant="outline" asChild className="w-full sm:w-auto" disabled={isProcessing}>
                <Link href="/assets">
                  <ListChecks className="mr-2 h-4 w-4" /> VIEW ASSETS
                </Link>
              </Button>
              <Button onClick={resetStepper} className="w-full sm:w-auto" disabled={isProcessing}>
                <FileUp className="mr-2 h-4 w-4" /> START NEW IMPORT
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// Utility component for icon, removed as it's not needed anymore
// const AlertInfo = (props: React.SVGProps<SVGSVGElement>) => ( ... );

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };


    