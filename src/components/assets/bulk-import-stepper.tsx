// src/components/assets/bulk-import-stepper.tsx
"use client";

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileUp, Loader2, ListChecks, Eye, UploadCloud, Check, X as XIcon } from 'lucide-react';
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
  'currentValue', 'retirementDate', 'tags',
  'hardware.vendor', 'hardware.model', 'hardware.type', 'hardware.category', 'hardware.version', 'hardware.endOfLife', 'hardware.orderNumber', 'hardware.vendorLink', 'hardware.description', 'hardware.ref',
  'hardware.extended.MTBF', 'hardware.extended.customField1', // Example nested extended
  'context.location.name', 'context.location.locationId', 'context.location.ref',
  'context.referenceLocation.name', 'context.referenceLocation.locationId', 'context.referenceLocation.ref',
  'context.otSystem.name', 'context.otSystem.id', 'context.deviceGroup',
  'context.businessProcesses[0].name', 'context.businessProcesses[0].criticality', 'context.businessProcesses[0].role', 'context.businessProcesses[0].ref', // Example for first item in array
  'warranty.startDate', 'warranty.endDate', 'warranty.provider', 'warranty.terms',
  'criticality.rating', 'criticality.impact', 'criticality.businessCriticality',
  'safety.certification', 'safety.level', 'safety.lastAssessment',
  'security.authenticationMethod', 'security.encryptionEnabled', 'security.securityScore', 'security.lastSecurityAssessment',
  // 'security.vulnerabilities[0].ref', // Array, handle as string/special logic
  // 'security.securityControls[0].ref', // Array
  // 'connections[0].network', 'connections[0].L3Address', 'connections[0].L2Address', // Array
  'digitalTwin.ref', 'digitalTwin.lastSynced',
  'maintenance.schedule.frequency', 'maintenance.schedule.nextScheduled', 'maintenance.schedule.lastPerformed',
  // 'maintenance.records[0].ref', // Array
  // 'behavior.normalPatterns[0].type', // Array
  'behavior.anomalyDetection.enabled', 'behavior.anomalyDetection.sensitivity', 'behavior.anomalyDetection.lastAnomaly',
  'riskAssessment.overallRisk', 'riskAssessment.impactToBusinessProcesses', 'riskAssessment.threatLevel', 'riskAssessment.lastAssessed',
  'extended.customField1', 'extended.customField2', // Top-level extended
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
    'deviceId': "Device ID", 'name': "Asset Name", 'os_firmware': "OS / Firmware",
    'hardware.vendor': "Hardware Vendor", 'hardware.model': "Hardware Model", 'hardware.type': "Hardware Type", 'hardware.category': "Hardware Category",
    'hardware.version': "Hardware Version", 'hardware.endOfLife': "Hardware End of Life", 'hardware.ref': "Hardware Ref",
    'context.location.name': "Location Name", 'context.location.locationId': "Location ID", 'context.location.ref': "Location Ref",
    'tags': 'Tags (comma-separated)',
  };
  if (overrides[fieldKey]) return overrides[fieldKey];
  return fieldKey.split('.').map(part => part.replace(/([A-Z0-9])/g, ' $1').replace(/\[\d+\]/g, '').replace(/^./, str => str.toUpperCase()).trim()).join(' - ');
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
    setFileData([]); setFileHeaders([]); setColumnMapping({}); setPreviewData([]); // Reset states

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
                if (parts.length > 1 && parts[parts.length - 1].toLowerCase() === simpleHeader) return true; // Match last part of dot notation
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

  const generatePreview = () => {
    setIsProcessing(true);
    setPreviewData([]); // Reset preview data
    const validated: ValidatedAsset[] = fileData.slice(0, 10).map(row => {
      const asset: Partial<Asset> = {};
      const errors: Record<string, string> = {};
      let isValidOverall = true;

      fileHeaders.forEach(fileHeaderKey => {
        const assetFieldKey = columnMapping[fileHeaderKey];
        const value = row[fileHeaderKey];

        if (assetFieldKey) {
          if (value !== undefined && value !== null && String(value).trim() !== "") {
            // Basic validation example
            if (assetFieldKey === 'hardware.type' && typeof value === 'string' && !ASSET_TYPE_VALUES_EXAMPLE.includes(value)) {
               errors[fileHeaderKey] = `Invalid type: ${value}. Expected one of: ${ASSET_TYPE_VALUES_EXAMPLE.join(', ')}`;
               isValidOverall = false;
            } else if (assetFieldKey === 'stage' && typeof value === 'string' && !ASSET_STAGE_VALUES_EXAMPLE.includes(value)) {
               errors[fileHeaderKey] = `Invalid stage: ${value}. Expected one of: ${ASSET_STAGE_VALUES_EXAMPLE.join(', ')}`;
               isValidOverall = false;
            } else if (['purchaseCost', 'currentValue', 'criticality.impact', 'criticality.businessCriticality', 'security.securityScore', 'days_since_last_patch', 'riskAssessment.overallRisk'].includes(assetFieldKey) && isNaN(parseFloat(String(value)))) {
              errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be a number. Got: ${value}`;
              isValidOverall = false;
            } else if (assetFieldKey === 'security.encryptionEnabled' && typeof value !== 'boolean' && String(value).toLowerCase() !== 'true' && String(value).toLowerCase() !== 'false') {
               errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} must be true/false. Got: ${value}`;
               isValidOverall = false;
            } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate', 'hardware.endOfLife', 'warranty.startDate', 'warranty.endDate', 'safety.lastAssessment', 'security.lastSecurityAssessment', 'digitalTwin.lastSynced', 'maintenance.schedule.nextScheduled', 'maintenance.schedule.lastPerformed', 'behavior.anomalyDetection.lastAnomaly', 'riskAssessment.lastAssessed'].includes(assetFieldKey)) {
              if (value && isNaN(new Date(String(value)).getTime())) {
                errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} invalid date. Got: ${value}`;
                isValidOverall = false;
              }
            }

            // Set value, handling dot notation
            const keys = assetFieldKey.split('.');
            let currentLevel = asset as any;
            keys.forEach((key, index) => {
              const arrayMatch = key.match(/^(.*)\[(\d+)\]$/); // Match array syntax like 'tags[0]'
              let actualKey = key;
              let arrayIndex: number | undefined = undefined;

              if(arrayMatch){
                actualKey = arrayMatch[1];
                arrayIndex = parseInt(arrayMatch[2]);
              }

              if (index === keys.length - 1) {
                let convertedValue: any = value;
                if (['purchaseCost', /* ... other numeric fields */].includes(assetFieldKey)) convertedValue = parseFloat(String(value));
                else if (assetFieldKey === 'security.encryptionEnabled') convertedValue = String(value).toLowerCase() === 'true';
                else if (assetFieldKey === 'tags' && typeof value === 'string') convertedValue = value.split(',').map(tag => tag.trim()).filter(tag => tag);
                else if (['installationDate', /* ... other date fields */].includes(assetFieldKey) && !isNaN(new Date(String(value)).getTime())) convertedValue = new Date(String(value)).toISOString();
                
                if (arrayIndex !== undefined) {
                  if (!currentLevel[actualKey] || !Array.isArray(currentLevel[actualKey])) {
                    currentLevel[actualKey] = [];
                  }
                  currentLevel[actualKey][arrayIndex] = convertedValue;
                } else {
                  currentLevel[actualKey] = convertedValue;
                }
              } else {
                if (arrayIndex !== undefined) {
                  if (!currentLevel[actualKey] || !Array.isArray(currentLevel[actualKey])) {
                    currentLevel[actualKey] = [];
                  }
                  if(!currentLevel[actualKey][arrayIndex]){
                     currentLevel[actualKey][arrayIndex] = {};
                  }
                  currentLevel = currentLevel[actualKey][arrayIndex];
                } else {
                  currentLevel[actualKey] = currentLevel[actualKey] || {};
                  currentLevel = currentLevel[actualKey];
                }
              }
            });
          } else if (REQUIRED_ASSET_FIELDS.includes(assetFieldKey)) {
            // Value is empty, but field is required
            errors[fileHeaderKey] = `${getFieldLabel(assetFieldKey)} is required but has no value.`;
            isValidOverall = false;
          }
        }
      });
      
      REQUIRED_ASSET_FIELDS.forEach(requiredAssetField => {
        if (!Object.values(columnMapping).includes(requiredAssetField)) {
             errors[`_unmapped_${requiredAssetField}`] = `${getFieldLabel(requiredAssetField)} is required but not mapped from any source column.`;
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
    // This would be the place to process all fileData, not just previewData
    const allValidatedAssets: ValidatedAsset[] = fileData.map(row => { // Re-validate all for production
      const asset: Partial<Asset> = {};
      let isValidOverall = true; // Simplified for this example
      // ... (full validation logic as in generatePreview for each row)
      fileHeaders.forEach(fileHeaderKey => {
        const assetFieldKey = columnMapping[fileHeaderKey];
        if (assetFieldKey && row[fileHeaderKey] !== undefined && row[fileHeaderKey] !== null && String(row[fileHeaderKey]).trim() !== "") {
          const value = row[fileHeaderKey];
          const keys = assetFieldKey.split('.');
          let currentLevel = asset as any;
          keys.forEach((key, index) => {
            const arrayMatch = key.match(/^(.*)\[(\d+)\]$/);
            let actualKey = key;
            let arrayIndex: number | undefined = undefined;
            if(arrayMatch){ actualKey = arrayMatch[1]; arrayIndex = parseInt(arrayMatch[2]); }

            if (index === keys.length - 1) {
              let convertedValue: any = value;
              if (['purchaseCost', /* ... */].includes(assetFieldKey)) convertedValue = parseFloat(String(value));
              else if (assetFieldKey === 'tags' && typeof value === 'string') convertedValue = value.split(',').map(tag => tag.trim()).filter(tag => tag);
              else if (['installationDate', /* ... */].includes(assetFieldKey) && !isNaN(new Date(String(value)).getTime())) convertedValue = new Date(String(value)).toISOString();
              
              if(arrayIndex !== undefined){ currentLevel[actualKey] = currentLevel[actualKey] || []; currentLevel[actualKey][arrayIndex] = convertedValue; }
              else { currentLevel[actualKey] = convertedValue; }
            } else {
              if(arrayIndex !== undefined){ currentLevel[actualKey] = currentLevel[actualKey] || []; currentLevel[actualKey][arrayIndex] = currentLevel[actualKey][arrayIndex] || {}; currentLevel = currentLevel[actualKey][arrayIndex]; }
              else { currentLevel[actualKey] = currentLevel[actualKey] || {}; currentLevel = currentLevel[actualKey]; }
            }
          });
        } else if (assetFieldKey && REQUIRED_ASSET_FIELDS.includes(assetFieldKey)) {
            isValidOverall = false;
        }
      });
      REQUIRED_ASSET_FIELDS.forEach(requiredAssetField => {
        if (!Object.values(columnMapping).includes(requiredAssetField)) {
             isValidOverall = false;
        }
      });
      return { ...asset, _originalRow: row, _validationErrors: {}, _isValid: isValidOverall }; // Errors not re-calculated here for brevity
    });

    const validAssetsToImport = allValidatedAssets.filter(p => p._isValid);
    const invalidAssetCount = allValidatedAssets.length - validAssetsToImport.length;

    setTimeout(() => { // Simulate API call
      setIsProcessing(false);
      if (validAssetsToImport.length > 0) {
        console.log("Simulated import of all valid assets:", validAssetsToImport.map(({ _originalRow, _validationErrors, _isValid, ...asset }) => asset));
        toast({
          title: 'Import Processed (Simulated)',
          description: `Successfully processed ${validAssetsToImport.length} assets from the file. ${invalidAssetCount} assets had errors and were skipped. See console for data.`,
        });
      } else {
         toast({
          title: 'No Valid Assets to Import',
          description: `No valid assets found in the file or all ${allValidatedAssets.length} assets had errors.`,
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
              NEXT
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
            <CardDescription>Review the validation status of your import data preview.</CardDescription>
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
                    <AlertInfo className="h-4 w-4" />
                    <AlertTitle>No Data Uploaded</AlertTitle>
                    <AlertDescription>
                     The uploaded file seems to be empty or could not be parsed. Please go back and upload a file with data.
                    </AlertDescription>
                </Alert>
            ) : allPreviewItemsValid ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400 p-4 rounded-md flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Validation Successful</p>
                    <p className="text-sm">No validation errors found in the preview. The data is ready to be imported.</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Validation Summary</h3>
                  <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">All previewed data is valid</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click 'IMPORT' to proceed with importing the {validPreviewCount} valid records from the preview into the database.
                  </p>
                </div>
              </div>
            ) : ( // hasPreviewData && invalidPreviewCount > 0
              <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Issues Found</AlertTitle>
                    <AlertDescription>
                    {invalidPreviewCount} of {previewData.length} previewed records have errors. Please review the table below. Rows with errors will be skipped if you proceed with the import.
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
                                        <li key={key}><strong>{key.startsWith('_unmapped_') ? getFieldLabel(key.replace('_unmapped_','')) : getFieldLabel(key) || key}:</strong> {String(errMsg)}</li>
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
              disabled={isProcessing || !hasPreviewData || (errorHandling === "no_stop" && invalidPreviewCount > 0)}
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
            <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-6 w-6 text-green-500"/>Step 4: Import Complete (Simulated)</CardTitle>
            <CardDescription>
              The asset import process has been simulated. Processed {fileData.length} row(s) from the file.
              {/* This summary needs to be updated based on the actual import result not previewData */}
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">You can now navigate to the assets list or start a new import.</p>
             {/* TODO: Add a summary of imported/failed rows if desired from 'allValidatedAssets' */}
          </CardContent>
          <CardFooter>
            <Button onClick={resetStepper}>
              <FileUp className="mr-2 h-4 w-4" /> Start New Import
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

const AlertInfo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }; // Already imported
