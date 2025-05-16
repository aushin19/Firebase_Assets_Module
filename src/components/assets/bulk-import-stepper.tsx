
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

type DataRow = Record<string, any>; // Changed from CSVRow to be more generic
type ColumnMapping = Record<keyof Asset, string | null>;

const ASSET_FIELDS_TO_MAP: (keyof Asset)[] = [
  'deviceId', 'name', 'description', 'documentation', 'installationDate', 'manufactureDate',
  'stage', 'lifecycle', 'serialNumber', 'last_seen', 'zone',
  'release', 'modified', 'exposure', 'os_firmware',
  'last_seen_by', 'last_patch_date', 'days_since_last_patch',
  'assignedUser', 'department', 'cpu', 'ram', 'storage', 'imageUrl',
  'purchaseCost', 'currentValue', 'retirementDate',
  // For complex fields like hardware, softwareList, connections, security, etc.,
  // direct mapping from a flat CSV/JSON is tricky.
  // Users might need to format their CSV/JSON with dot notation (e.g., hardware.vendor)
  // or we'd need a more advanced mapping UI.
  // For now, we'll keep it simple, focusing on top-level or easily mappable fields.
  // Add specific nested fields if direct mapping is intended:
  // e.g., 'hardware.vendor', 'hardware.model', 'hardware.type' (as strings)
];

// Simplified required fields for the purpose of this example.
// In a real scenario, this would depend on your actual data validation rules.
const REQUIRED_ASSET_FIELDS: (keyof Asset)[] = ['deviceId', 'name', 'stage'];


// These are illustrative and need to align with your actual schema's expected string values for stage/type
const ASSET_TYPE_VALUES_EXAMPLE: string[] = ['PLC', 'Laptop', 'Router', 'Workstation', 'Printer', 'MobileDevice', 'Server', 'Switch', 'Other'];
const ASSET_STAGE_VALUES_EXAMPLE: string[] = ['Operational', 'Active', 'Online', 'In Use', 'Standby', 'Inactive', 'Offline', 'Maintenance', 'In Repair', 'End of Life', 'Disposed', 'Retired', 'Missing', 'Planning', 'Commissioning', 'Testing'];


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
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({} as ColumnMapping);
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

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      Papa.parse<DataRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setFileHeaders(results.meta.fields || []);
          setFileData(results.data);
          const initialMapping = {} as ColumnMapping;
          ASSET_FIELDS_TO_MAP.forEach(field => {
            const foundHeader = (results.meta.fields || []).find(h => h.toLowerCase() === String(field).toLowerCase());
            initialMapping[field] = foundHeader || null;
          });
          setColumnMapping(initialMapping);
          setIsProcessing(false);
          setCurrentStep(2);
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
              setFileHeaders(headers);
              setFileData(jsonData);

              const initialMapping = {} as ColumnMapping;
              ASSET_FIELDS_TO_MAP.forEach(field => {
                const foundHeader = headers.find(h => h.toLowerCase() === String(field).toLowerCase());
                initialMapping[field] = foundHeader || null;
              });
              setColumnMapping(initialMapping);
              setIsProcessing(false);
              setCurrentStep(2);
            } else {
              toast({ title: 'Invalid JSON Format', description: 'JSON data should be an array of objects.', variant: 'destructive' });
              setIsProcessing(false);
            }
          } else if (Array.isArray(jsonData) && jsonData.length === 0) {
            toast({ title: 'Empty JSON Array', description: 'The JSON file is an empty array. No data to import.', variant: 'default' });
            setFileHeaders([]);
            setFileData([]);
            setIsProcessing(false);
             // Optionally proceed to mapping if you want to allow mapping for an empty structure
            // setCurrentStep(2);
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

  const handleMappingChange = (assetField: keyof Asset, csvHeader: string | null) => {
    setColumnMapping(prev => ({ ...prev, [assetField]: csvHeader }));
  };

  const generatePreview = () => {
    setIsProcessing(true);
    const validated: ValidatedAsset[] = fileData.slice(0, 10).map(row => {
      const asset: Partial<Asset> = { hardware: {} as Asset['hardware'] }; 
      const errors: Record<string, string> = {};
      let isValidOverall = true;

      ASSET_FIELDS_TO_MAP.forEach(assetFieldKey => {
        const assetField = assetFieldKey as keyof Asset;
        const mappedHeader = columnMapping[assetField];
        
        if (mappedHeader && row[mappedHeader] !== undefined) {
          const value = row[mappedHeader];
          
          // Basic validation example - expand as needed
          if (assetField === 'hardware.type' && typeof value === 'string' && !ASSET_TYPE_VALUES_EXAMPLE.includes(value)) {
             errors[assetField] = `Invalid type: ${value}.`;
             isValidOverall = false;
          } else if (assetField === 'stage' && typeof value === 'string' && !ASSET_STAGE_VALUES_EXAMPLE.includes(value)) {
             errors[assetField] = `Invalid stage: ${value}.`;
             isValidOverall = false;
          } else if ((assetField === 'purchaseCost' || assetField === 'currentValue') && value !== null && value !== undefined && isNaN(parseFloat(String(value)))) {
            errors[assetField] = `${String(assetField)} must be a number.`;
            isValidOverall = false;
            (asset as any)[assetField] = parseFloat(String(value));
          } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate'].includes(String(assetField))) {
            if (value && isNaN(new Date(String(value)).getTime())) {
              errors[assetField] = `${String(assetField)} must be a valid date (e.g., YYYY-MM-DD).`;
              isValidOverall = false;
            }
            (asset as any)[assetField] = value ? new Date(String(value)).toISOString() : undefined;
          } else {
            // Handle potential dot notation for nested properties
            const keys = String(assetField).split('.');
            let currentLevel = asset as any;
            keys.forEach((key, index) => {
              if (index === keys.length - 1) {
                currentLevel[key] = value;
              } else {
                currentLevel[key] = currentLevel[key] || {};
                currentLevel = currentLevel[key];
              }
            });
            if (assetField === 'purchaseCost' || assetField === 'currentValue') {
               if (value !== null && value !== undefined) (asset as any)[assetField] = parseFloat(String(value));
            }
          }
        } else if (REQUIRED_ASSET_FIELDS.includes(assetField)) {
            errors[assetField] = `${String(assetField)} is required but not mapped or missing.`;
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
        toast({
          title: 'Import Processed (Simulated)',
          description: `Successfully processed ${validAssetsToImport.length} assets from the preview. In a real application, these would be saved.`,
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
              <p>Maximum file size: 10MB</p>
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
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Step 2: Map File Columns/Keys to Asset Fields</CardTitle>
            <CardDescription>Match the columns (from CSV) or keys (from JSON) from your file to the corresponding asset fields. Required fields are marked (*).</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {ASSET_FIELDS_TO_MAP.map(assetFieldKey => {
                const assetField = assetFieldKey as keyof Asset;
                let label = String(assetField).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                if (assetField === 'deviceId') label = "Device ID";
                if (assetField === 'os_firmware') label = "OS / Firmware";
                
                return (
                  <div key={assetField} className="space-y-1.5">
                    <label htmlFor={`map-${assetField}`} className="text-sm font-medium">
                      {label}
                      {REQUIRED_ASSET_FIELDS.includes(assetField) && <span className="text-destructive ml-1">*</span>}
                    </label>
                    <Select
                      value={columnMapping[assetField] || ''}
                      onValueChange={(value) => handleMappingChange(assetField, value === 'none' ? null : value)}
                    >
                      <SelectTrigger id={`map-${assetField}`}>
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
                  For complex/nested fields (e.g., 'Hardware Details', 'Software List'), ensure your JSON structure matches or use dot notation in CSV headers (e.g., `hardware.vendor`). Direct mapping of deeply nested arrays of objects might be limited.
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
                    {ASSET_FIELDS_TO_MAP.filter(field => columnMapping[field as keyof Asset]).map(field => (
                      <TableHead key={String(field)}>{String(field).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</TableHead>
                    ))}
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
                      {ASSET_FIELDS_TO_MAP.filter(field => columnMapping[field as keyof Asset]).map(assetFieldKey => {
                        const assetField = assetFieldKey as keyof Asset;
                        // Attempt to access potentially nested values for preview
                        const keys = String(assetField).split('.');
                        let displayValue = item as any;
                        for (const key of keys) {
                          if (displayValue && typeof displayValue === 'object' && key in displayValue) {
                            displayValue = displayValue[key];
                          } else {
                            displayValue = undefined; // Path doesn't exist
                            break;
                          }
                        }
                        if (typeof displayValue === 'object' && displayValue !== null) {
                            displayValue = JSON.stringify(displayValue); // Show raw object if complex
                        }

                        return (
                          <TableCell key={String(assetField)}>
                            <div className="flex flex-col">
                              <span>{displayValue !== undefined && displayValue !== null ? String(displayValue) : <span className="italic text-muted-foreground">empty</span>}</span>
                              {item._validationErrors[assetField] && (
                                <span className="text-xs text-destructive">{item._validationErrors[assetField]}</span>
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
                    Review highlighted rows. Go back to correct mappings or fix your file. Rows with errors will be skipped.
                    </AlertDescription>
                </Alert>
            )}
             {previewData.length === 0 && fileData.length > 0 && !isProcessing && (
                 <Alert variant="default" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Preview Data</AlertTitle>
                    <AlertDescription>
                     Could not generate preview. Check mappings for required fields or file structure.
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
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">You can now navigate to assets list or start a new import.</p>
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
