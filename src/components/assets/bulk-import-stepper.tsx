
// src/components/assets/bulk-import-stepper.tsx
"use client";

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileUp, Loader2, ListChecks, Eye, UploadCloud, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Asset, AssetStatus, AssetType } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';

type DataRow = Record<string, any>; 
type ColumnMapping = Record<string, string | null>; // Key is Asset field path (e.g., 'hardware.vendor')

// Define Asset fields available for mapping. Dot notation for nested fields.
const ASSET_FIELDS_TO_MAP: string[] = [
  'deviceId', 'name', 'description', 'documentation', 
  'installationDate', 'manufactureDate', 'stage', 'lifecycle', 
  'serialNumber', 'last_seen', 'zone', 'release', 'modified', 
  'exposure', 'os_firmware', 'last_seen_by', 'last_patch_date', 
  'days_since_last_patch', 'assignedUser', 'department', 
  'cpu', 'ram', 'storage', 'imageUrl', 'purchaseCost', 
  'currentValue', 'retirementDate',
  // Nested fields using dot notation
  'hardware.vendor', 'hardware.model', 'hardware.type', 'hardware.category', 'hardware.version', 'hardware.endOfLife',
  'context.location.name', 'context.location.locationId',
  'context.referenceLocation.name',
  'context.otSystem.name', 'context.deviceGroup',
  'warranty.startDate', 'warranty.endDate', 'warranty.provider',
  'criticality.rating', 'criticality.impact', 'criticality.businessCriticality',
  'safety.certification', 'safety.level',
  // Simple security fields (complex arrays like vulnerabilities are harder with flat import)
  'security.authenticationMethod', 'security.encryptionEnabled', 'security.securityScore',
];


const REQUIRED_ASSET_FIELDS: string[] = ['deviceId', 'name', 'stage'];


// These are illustrative and need to align with your actual schema's expected string values for stage/type
const ASSET_TYPE_VALUES_EXAMPLE: string[] = ['PLC', 'Laptop', 'Router', 'Workstation', 'Printer', 'MobileDevice', 'Server', 'Switch', 'Other', 'Sensor', 'HMI'];
const ASSET_STAGE_VALUES_EXAMPLE: string[] = ['Operational', 'Active', 'Online', 'In Use', 'Standby', 'Inactive', 'Offline', 'Maintenance', 'In Repair', 'End of Life', 'Disposed', 'Retired', 'Missing', 'Planning', 'Commissioning', 'Testing', 'Active Support', 'Limited Support', 'Unsupported'];


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

    const processParsedData = (data: DataRow[], headers: string[]) => {
        setFileHeaders(headers);
        setFileData(data);
        const initialMapping: ColumnMapping = {};
        ASSET_FIELDS_TO_MAP.forEach(assetField => {
          // Attempt to auto-map if header matches assetField (case-insensitive, ignore spaces for assetField)
          // or if header matches a human-readable version of assetField
          const simpleAssetField = assetField.toLowerCase().replace(/\s/g, '');
          const foundHeader = headers.find(h => {
            const simpleHeader = h.toLowerCase().replace(/\s/g, '');
            if (simpleHeader === simpleAssetField) return true;
            // Check for common pattern like "Hardware Vendor" json key for "hardware.vendor" asset field
            const parts = assetField.split('.');
            if (parts.length > 1) {
                const readableGuess = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
                if (h === readableGuess) return true;
            }
            return false;
          });
          initialMapping[assetField] = foundHeader || null;
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
            setFileHeaders([]);
            setFileData([]);
            processParsedData([], []); // Proceed with empty data for mapping
          }
          else {
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
    } else {
      toast({ title: 'Unsupported File Type', description: 'Please upload a CSV or JSON file.', variant: 'destructive' });
      setIsProcessing(false);
    }
  }, [file, toast]);

  const handleMappingChange = (assetField: string, fileHeader: string | null) => {
    setColumnMapping(prev => ({ ...prev, [assetField]: fileHeader }));
  };

  const generatePreview = () => {
    setIsProcessing(true);
    const validated: ValidatedAsset[] = fileData.slice(0, 10).map(row => {
      const asset: Partial<Asset> = {}; 
      const errors: Record<string, string> = {};
      let isValidOverall = true;

      ASSET_FIELDS_TO_MAP.forEach(assetFieldKey => {
        const mappedHeader = columnMapping[assetFieldKey];
        
        if (mappedHeader && row[mappedHeader] !== undefined && row[mappedHeader] !== null && row[mappedHeader] !== "") {
          const value = row[mappedHeader];
          
          // Basic validation example - expand as needed
          if (assetFieldKey === 'hardware.type' && typeof value === 'string' && !ASSET_TYPE_VALUES_EXAMPLE.includes(value)) {
             errors[assetFieldKey] = `Invalid type: ${value}. Expected one of: ${ASSET_TYPE_VALUES_EXAMPLE.join(', ')}`;
             isValidOverall = false;
          } else if (assetFieldKey === 'stage' && typeof value === 'string' && !ASSET_STAGE_VALUES_EXAMPLE.includes(value)) {
             errors[assetFieldKey] = `Invalid stage: ${value}. Expected one of: ${ASSET_STAGE_VALUES_EXAMPLE.join(', ')}`;
             isValidOverall = false;
          } else if ((assetFieldKey === 'purchaseCost' || assetFieldKey === 'currentValue' || assetFieldKey === 'criticality.impact' || assetFieldKey === 'criticality.businessCriticality' || assetFieldKey === 'security.securityScore' || assetFieldKey === 'days_since_last_patch') && isNaN(parseFloat(String(value)))) {
            errors[assetFieldKey] = `${assetFieldKey} must be a number.`;
            isValidOverall = false;
          } else if (assetFieldKey === 'security.encryptionEnabled' && typeof value !== 'boolean') {
             errors[assetFieldKey] = `${assetFieldKey} must be true or false.`;
             isValidOverall = false;
          } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate', 'hardware.endOfLife', 'warranty.startDate', 'warranty.endDate'].includes(assetFieldKey)) {
            if (value && isNaN(new Date(String(value)).getTime())) {
              errors[assetFieldKey] = `${assetFieldKey} must be a valid date (e.g., YYYY-MM-DD or ISO string).`;
              isValidOverall = false;
            }
          }
          
          // Set value, handling dot notation for nested properties
          const keys = assetFieldKey.split('.');
          let currentLevel = asset as any;
          keys.forEach((key, index) => {
            if (index === keys.length - 1) {
              // Type conversion for specific fields
              if ((assetFieldKey === 'purchaseCost' || assetFieldKey === 'currentValue' || assetFieldKey === 'criticality.impact' || assetFieldKey === 'criticality.businessCriticality' || assetFieldKey === 'security.securityScore' || assetFieldKey === 'days_since_last_patch') && !isNaN(parseFloat(String(value)))) {
                currentLevel[key] = parseFloat(String(value));
              } else if (assetFieldKey === 'security.encryptionEnabled') {
                currentLevel[key] = String(value).toLowerCase() === 'true';
              } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate', 'hardware.endOfLife', 'warranty.startDate', 'warranty.endDate'].includes(assetFieldKey) && !isNaN(new Date(String(value)).getTime())) {
                currentLevel[key] = new Date(String(value)).toISOString();
              }
              else {
                currentLevel[key] = value;
              }
            } else {
              currentLevel[key] = currentLevel[key] || {};
              currentLevel = currentLevel[key];
            }
          });

        } else if (REQUIRED_ASSET_FIELDS.includes(assetFieldKey) && (!mappedHeader || row[mappedHeader] === undefined || row[mappedHeader] === null || row[mappedHeader] === "")) {
            errors[assetFieldKey] = `${assetFieldKey} is required but not mapped or missing value.`;
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
    const validAssetsToImport = previewData.filter(p => p._isValid);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      if (validAssetsToImport.length > 0) {
        console.log("Simulated import of valid assets:", validAssetsToImport.map(({ _originalRow, _validationErrors, _isValid, ...asset }) => asset));
        toast({
          title: 'Import Processed (Simulated)',
          description: `Successfully processed ${validAssetsToImport.length} assets from the preview. See console for data. In a real application, these would be saved.`,
          variant: 'default'
        });
      } else {
         toast({
          title: 'No Valid Assets to Import',
          description: 'No valid assets found in the preview data or no data to preview.',
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
  }

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
                For CSV, the file should contain asset data with column headers. For JSON, provide an array of asset objects with flat key-value pairs or structures that can be mapped. In the next step, you will map columns/keys to database fields.
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
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Step 2: Map File Columns/Keys to Asset Fields</CardTitle>
            <CardDescription>Match the columns (from CSV) or keys (from JSON) from your file to the corresponding asset fields. Required fields are marked (*).</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {ASSET_FIELDS_TO_MAP.map(assetFieldKey => {
                let label = String(assetFieldKey).replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                // Custom labels for better readability
                if (assetFieldKey === 'deviceId') label = "Device ID";
                else if (assetFieldKey === 'os_firmware') label = "OS / Firmware";
                else if (assetFieldKey === 'name') label = "Asset Name";
                else if (assetFieldKey === 'description') label = "Description";
                else if (assetFieldKey === 'hardware.vendor') label = "Hardware Vendor";
                else if (assetFieldKey === 'hardware.model') label = "Hardware Model";
                else if (assetFieldKey === 'hardware.type') label = "Hardware Type";
                else if (assetFieldKey === 'hardware.category') label = "Hardware Category";
                else if (assetFieldKey === 'hardware.version') label = "Hardware Version";
                else if (assetFieldKey === 'hardware.endOfLife') label = "Hardware End of Life";
                else if (assetFieldKey === 'installationDate') label = "Installation Date";
                else if (assetFieldKey === 'manufactureDate') label = "Manufacture Date";
                else if (assetFieldKey === 'stage') label = "Asset Stage";
                else if (assetFieldKey === 'lifecycle') label = "Lifecycle Stage";
                else if (assetFieldKey === 'serialNumber') label = "Serial Number";
                else if (assetFieldKey === 'last_seen') label = "Last Seen Timestamp";
                else if (assetFieldKey === 'zone') label = "Network Zone";
                else if (assetFieldKey === 'release') label = "Release Version";
                else if (assetFieldKey === 'modified') label = "Config Last Modified Date";
                else if (assetFieldKey === 'exposure') label = "Network Exposure";
                else if (assetFieldKey === 'last_seen_by') label = "Last Seen By (Node)";
                else if (assetFieldKey === 'last_patch_date') label = "Last Patch Date";
                else if (assetFieldKey === 'days_since_last_patch') label = "Days Since Last Patch";
                else if (assetFieldKey === 'assignedUser') label = "Assigned User";
                else if (assetFieldKey === 'department') label = "Department";
                else if (assetFieldKey === 'cpu') label = "CPU (Legacy)";
                else if (assetFieldKey === 'ram') label = "RAM (Legacy)";
                else if (assetFieldKey === 'storage') label = "Storage (Legacy)";
                else if (assetFieldKey === 'imageUrl') label = "Image URL";
                else if (assetFieldKey === 'purchaseCost') label = "Purchase Cost";
                else if (assetFieldKey === 'currentValue') label = "Current Value";
                else if (assetFieldKey === 'retirementDate') label = "Retirement Date";
                else if (assetFieldKey === 'context.location.name') label = "Location Name";
                else if (assetFieldKey === 'context.location.locationId') label = "Location ID";
                else if (assetFieldKey === 'context.referenceLocation.name') label = "Reference Location Name";
                else if (assetFieldKey === 'context.otSystem.name') label = "OT System Name";
                else if (assetFieldKey === 'context.deviceGroup') label = "Device Group";
                else if (assetFieldKey === 'warranty.startDate') label = "Warranty Start Date";
                else if (assetFieldKey === 'warranty.endDate') label = "Warranty End Date";
                else if (assetFieldKey === 'warranty.provider') label = "Warranty Provider";
                else if (assetFieldKey === 'criticality.rating') label = "Criticality Rating";
                else if (assetFieldKey === 'criticality.impact') label = "Criticality Impact Score";
                else if (assetFieldKey === 'criticality.businessCriticality') label = "Business Criticality Score";
                else if (assetFieldKey === 'safety.certification') label = "Safety Certification";
                else if (assetFieldKey === 'safety.level') label = "Safety Level (SIL)";
                else if (assetFieldKey === 'security.authenticationMethod') label = "Authentication Method";
                else if (assetFieldKey === 'security.encryptionEnabled') label = "Encryption Enabled";
                else if (assetFieldKey === 'security.securityScore') label = "Security Score";
                else if (assetFieldKey === 'documentation') label = "Documentation URL";
                
                return (
                  <div key={assetFieldKey} className="space-y-1.5">
                    <label htmlFor={`map-${assetFieldKey}`} className="text-sm font-medium">
                      {label}
                      {REQUIRED_ASSET_FIELDS.includes(assetFieldKey) && <span className="text-destructive ml-1">*</span>}
                    </label>
                    <Select
                      value={columnMapping[assetFieldKey] || ''}
                      onValueChange={(value) => handleMappingChange(assetFieldKey, value === 'none' ? null : value)}
                    >
                      <SelectTrigger id={`map-${assetFieldKey}`}>
                        <SelectValue placeholder="Select File Column/Key..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Do Not Map --</SelectItem>
                        {fileHeaders.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            </ScrollArea>
             <Alert variant="default" className="mt-4 bg-secondary/30">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="font-semibold text-foreground">Mapping Complex Data</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  For complex/nested fields (e.g., 'Software List', 'Connections Array'), direct mapping of arrays or deeply nested objects from flat files is limited. Prepare your JSON/CSV accordingly or plan for post-import processing.
                </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
            <Button onClick={generatePreview} disabled={isProcessing || fileData.length === 0}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              NEXT
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Eye className="mr-2 h-6 w-6 text-primary"/>Step 3: Preview and Validate Data</CardTitle>
            <CardDescription>Review the first 10 rows. Errors are highlighted. Ensure mappings are correct before importing.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    {ASSET_FIELDS_TO_MAP.filter(fieldKey => columnMapping[fieldKey]).map(fieldKey => {
                       let label = String(fieldKey).replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                        // Use the same label generation as in step 2 for consistency
                        if (fieldKey === 'deviceId') label = "Device ID";
                        else if (fieldKey === 'os_firmware') label = "OS / Firmware";
                        else if (fieldKey === 'name') label = "Asset Name";
                        else if (fieldKey === 'hardware.vendor') label = "Hardware Vendor";
                        else if (fieldKey === 'hardware.model') label = "Hardware Model";
                        else if (fieldKey === 'hardware.type') label = "Hardware Type";
                        else if (fieldKey === 'stage') label = "Asset Stage";
                        // Add more for other commonly mapped fields if desired
                       return <TableHead key={String(fieldKey)}>{label}</TableHead>
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((item, index) => (
                    <TableRow key={index} className={!item._isValid ? 'bg-destructive/10' : ''}>
                      <TableCell>
                        {item._isValid ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                      </TableCell>
                      {ASSET_FIELDS_TO_MAP.filter(fieldKey => columnMapping[fieldKey]).map(assetFieldKey => {
                        const keys = assetFieldKey.split('.');
                        let displayValue = item as any;
                        for (const key of keys) {
                          if (displayValue && typeof displayValue === 'object' && key in displayValue) {
                            displayValue = displayValue[key];
                          } else {
                            displayValue = undefined; 
                            break;
                          }
                        }
                        if (typeof displayValue === 'object' && displayValue !== null) {
                            displayValue = JSON.stringify(displayValue); 
                        } else if (typeof displayValue === 'boolean') {
                            displayValue = displayValue ? 'true' : 'false';
                        }


                        return (
                          <TableCell key={String(assetFieldKey)}>
                            <div className="flex flex-col">
                              <span>{displayValue !== undefined && displayValue !== null ? String(displayValue) : <span className="italic text-muted-foreground">empty</span>}</span>
                              {item._validationErrors[assetFieldKey] && (
                                <span className="text-xs text-destructive">{item._validationErrors[assetFieldKey]}</span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {previewData.some(item => !item._isValid) && (
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors Found</AlertTitle>
                    <AlertDescription>
                    Review highlighted rows. Go back to correct mappings or fix your file. Rows with errors will be skipped during import.
                    </AlertDescription>
                </Alert>
            )}
             {previewData.length === 0 && fileData.length > 0 && !isProcessing && (
                 <Alert variant="default" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Preview Data</AlertTitle>
                    <AlertDescription>
                     Could not generate preview. Check mappings for required fields or file structure. Ensure data rows exist.
                    </AlertDescription>
                </Alert>
            )}
             {fileData.length === 0 && !isProcessing && (
                 <Alert variant="default" className="mt-4">
                    <AlertInfo className="h-4 w-4" />
                    <AlertTitle>No Data Uploaded</AlertTitle>
                    <AlertDescription>
                     The uploaded file seems to be empty or could not be parsed. Please upload a file with data.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
            <Button onClick={handleImport} disabled={isProcessing || previewData.filter(p=>p._isValid).length === 0 && fileData.length > 0}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Import Valid Data (Simulated)
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-6 w-6 text-green-500"/>Step 4: Import Complete (Simulated)</CardTitle>
            <CardDescription>
              The asset import process has been simulated.
              {previewData.filter(p => p._isValid).length > 0 
                ? ` ${previewData.filter(p => p._isValid).length} asset(s) from the preview would have been imported.`
                : ' No valid assets were available in the preview to import.'
              }
              {previewData.filter(p => !p._isValid).length > 0 && 
                ` ${previewData.filter(p => !p._isValid).length} row(s) had validation errors and were skipped.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">You can now navigate to the assets list or start a new import.</p>
             {/* You could add a summary of imported/failed rows here if desired */}
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

// Helper icon, replace if you have a specific one or remove
const AlertInfo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
