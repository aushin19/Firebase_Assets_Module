
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
import type { Asset, AssetStatus, AssetType } from '@/types'; // Removed Software as it's not directly mapped
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';

type CSVRow = Record<string, string>;
type ColumnMapping = Record<keyof Asset, string | null>;

const ASSET_FIELDS_TO_MAP: (keyof Asset)[] = [
  'deviceId', 'name', 'description', 'documentation', 'installationDate', 'manufactureDate',
  // 'warranty', // Complex object, handle separately if needed
  'stage', 'lifecycle', 'serialNumber', 'last_seen', 'zone',
  // 'safety', // Complex object
  'release',
  // 'criticality', // Complex object
  'modified', 'exposure',
  // 'hardware', // Complex object
  // 'context', // Complex object
  'os_firmware',
  // 'softwareList', // Array of complex objects
  // 'tags', // Array of strings
  // 'connections', // Array of complex objects
  // 'extended', // Record<string, any>
  'last_seen_by',
  // 'monitors', // Array of complex objects
  'last_patch_date', 'days_since_last_patch',
  // 'security', // Complex object
  // 'compliance', // Complex object
  // 'digitalTwin', // Complex object
  // 'maintenance', // Complex object
  // 'behavior', // Complex object
  // 'riskAssessment', // Complex object
  'assignedUser', 'department', 'cpu', 'ram', 'storage', 'imageUrl',
  'purchaseCost', 'currentValue', 'retirementDate'
];

const REQUIRED_ASSET_FIELDS: (keyof Asset)[] = ['deviceId', 'name', 'hardware', 'stage'];


// These are illustrative and need to align with your actual schema's expected string values for stage/type
const ASSET_TYPE_VALUES_EXAMPLE: string[] = ['PLC', 'Laptop', 'Router', 'Workstation', 'Printer', 'MobileDevice', 'Server', 'Switch', 'Other'];
const ASSET_STAGE_VALUES_EXAMPLE: string[] = ['Operational', 'Active', 'Online', 'In Use', 'Standby', 'Inactive', 'Offline', 'Maintenance', 'In Repair', 'End of Life', 'Disposed', 'Retired', 'Missing', 'Planning', 'Commissioning', 'Testing'];


interface ValidatedAsset extends Partial<Asset> {
  _originalRow: CSVRow;
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
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
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
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        toast({ title: 'File Selected', description: selectedFile.name });
      } else {
        toast({ title: 'Invalid File Type', description: 'Please upload a CSV file. Excel and JSON are not yet supported.', variant: 'destructive' });
        setFile(null);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const parseCSV = useCallback(() => {
    if (!file) return;
    setIsProcessing(true);
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        setCsvData(results.data);
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
  }, [file, toast]);

  const handleMappingChange = (assetField: keyof Asset, csvHeader: string | null) => {
    setColumnMapping(prev => ({ ...prev, [assetField]: csvHeader }));
  };

  const generatePreview = () => {
    setIsProcessing(true);
    const validated: ValidatedAsset[] = csvData.slice(0, 10).map(row => {
      const asset: Partial<Asset> = { hardware: {} as Asset['hardware'] }; // Initialize hardware
      const errors: Record<string, string> = {};
      let isValidOverall = true;

      ASSET_FIELDS_TO_MAP.forEach(assetFieldKey => {
        const assetField = assetFieldKey as keyof Asset; // Type assertion
        const csvHeader = columnMapping[assetField];
        if (csvHeader && row[csvHeader] !== undefined) {
          const value = row[csvHeader];
          
          // Basic validation for example (needs to be much more comprehensive for new schema)
          if (assetField === 'hardware.type' && !ASSET_TYPE_VALUES_EXAMPLE.includes(value as string)) {
             errors[assetField] = `Invalid type: ${value}. Must be one of: ${ASSET_TYPE_VALUES_EXAMPLE.join(', ')}`;
             isValidOverall = false;
          } else if (assetField === 'stage' && !ASSET_STAGE_VALUES_EXAMPLE.includes(value as string)) {
             errors[assetField] = `Invalid stage: ${value}. Must be one of: ${ASSET_STAGE_VALUES_EXAMPLE.join(', ')}`;
             isValidOverall = false;
          } else if ((assetField === 'purchaseCost' || assetField === 'currentValue') && isNaN(parseFloat(value))) {
            errors[assetField] = `${String(assetField)} must be a number.`; // Use String() for safety
            isValidOverall = false;
            (asset as any)[assetField] = parseFloat(value);
          } else if (['installationDate', 'manufactureDate', 'last_seen', 'modified', 'last_patch_date', 'retirementDate'].includes(String(assetField))) {
            if (isNaN(new Date(value).getTime())) {
              errors[assetField] = `${String(assetField)} must be a valid date (e.g., YYYY-MM-DD).`;
              isValidOverall = false;
            }
            (asset as any)[assetField] = value;
          } else {
            // Handle nested properties like hardware.vendor if needed for direct mapping
            // This simple assignment works for top-level or if CSV headers match nested paths (e.g. "hardware.vendor")
            // For complex objects, a more robust mapping/transformation is needed.
            const keys = String(assetField).split('.');
            if (keys.length > 1 && keys[0] === 'hardware') {
                (asset.hardware as any)[keys[1]] = value;
            } else {
                (asset as any)[assetField] = value;
            }

            if (assetField === 'purchaseCost' || assetField === 'currentValue') {
              (asset as any)[assetField] = parseFloat(value);
            }
          }
        } else if (REQUIRED_ASSET_FIELDS.includes(assetField) && assetField !== 'hardware') { // hardware is an object, check its fields
            errors[assetField] = `${String(assetField)} is required but not mapped or missing.`;
            isValidOverall = false;
        } else if (assetField === 'hardware' && (!asset.hardware?.vendor || !asset.hardware?.model || !asset.hardware?.type)) {
            // Example check for required hardware fields
            errors['hardware'] = `Hardware vendor, model, and type are required.`;
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
    setTimeout(() => {
      setIsProcessing(false);
      if (validAssetsToImport.length > 0) {
        toast({
          title: 'Import Processed (Simulated)',
          description: `Successfully processed ${validAssetsToImport.length} assets from the preview. In a real application, these would be saved to the database.`,
          variant: 'default'
        });
      } else {
         toast({
          title: 'No Valid Assets to Import',
          description: 'No valid assets found in the preview data. Please check mappings and data.',
          variant: 'destructive'
        });
      }
      setCurrentStep(4);
    }, 1500);
  };
  
  const resetStepper = () => {
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setCsvHeaders([]);
    setCsvData([]);
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
            {/* <CardDescription>Select a CSV file containing the assets you want to import. Ensure the first row contains headers.</CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
              onClick={handleBrowseClick}
              onDragOver={(e) => e.preventDefault()} // Basic drag over handler
              onDrop={(e) => { // Basic drop handler
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const droppedFile = e.dataTransfer.files[0];
                   if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
                    setFile(droppedFile);
                    toast({ title: 'File Dropped', description: droppedFile.name });
                  } else {
                    toast({ title: 'Invalid File Type', description: 'Please drop a CSV file. Excel and JSON are not yet supported.', variant: 'destructive' });
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
                accept=".csv" 
                onChange={handleFileChange} 
                className="hidden" 
                ref={fileInputRef} 
              />
            </div>
            {file && <p className="text-sm text-muted-foreground text-center mt-2">Selected file: {file.name}</p>}
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)</p>
              <p>Maximum file size: 10MB</p>
            </div>
            <Alert variant="default" className="bg-secondary/30">
              <ListChecks className="h-4 w-4 text-primary" />
              <AlertTitle className="font-semibold text-foreground">Note</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                The file should contain asset data with column headers that match the field names in the database. In the next step, you will be able to map the columns from your file to the database fields.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => {/* Placeholder for back action */}} disabled={true /* No back from step 1 */}>
              BACK
            </Button>
            <Button onClick={parseCSV} disabled={!file || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              NEXT
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Step 2: Map CSV Columns to Asset Fields</CardTitle>
            <CardDescription>Match the columns from your CSV file to the corresponding asset fields in AssetLens. Required fields are marked with an asterisk (*). Fields for complex data (like hardware details, software lists) may require specific CSV formatting or will be simplified.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {ASSET_FIELDS_TO_MAP.map(assetFieldKey => {
                const assetField = assetFieldKey as keyof Asset;
                // More user-friendly labels:
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
                        <SelectValue placeholder="Select CSV Column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Do Not Map --</SelectItem>
                        {csvHeaders.map(header => (
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
                  For complex fields like 'Hardware' or 'Software List', direct mapping might be limited. 
                  Consider using dot notation in your CSV headers (e.g., `hardware.vendor`, `hardware.model`) for simple nested properties. 
                  Arrays of objects (like Software List) are best handled via specialized import scripts or simplified to a comma-separated string if this basic mapper is used.
                </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
            <Button onClick={generatePreview} disabled={isProcessing || csvData.length === 0}>
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
            <CardDescription>Review the first 10 rows of your data with the applied mappings. Errors are highlighted. Ensure all required fields are correctly mapped and data is valid before importing.</CardDescription>
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
                        let displayValue = (item as any)[assetField];
                        // Handle nested display for preview (e.g. hardware.type)
                        if (String(assetField).startsWith('hardware.')) {
                            const subField = String(assetField).split('.')[1];
                            displayValue = item.hardware?.[subField as keyof Asset['hardware']];
                        }

                        return (
                          <TableCell key={String(assetField)}>
                            <div className="flex flex-col">
                              <span>{displayValue || <span className="italic text-muted-foreground">empty</span>}</span>
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
                    Some rows have validation errors. Please review the highlighted rows and go back to Step 2 to correct mappings or fix your CSV file if necessary.
                    You can still proceed with importing only the valid rows, but rows with errors will be skipped.
                    </AlertDescription>
                </Alert>
            )}
             {previewData.length === 0 && csvData.length > 0 && !isProcessing && (
                 <Alert variant="default" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Preview Data</AlertTitle>
                    <AlertDescription>
                     Could not generate preview. This might be due to missing mappings for required fields or issues with the CSV structure. Please check your column mappings.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
            <Button onClick={handleImport} disabled={isProcessing || previewData.filter(p=>p._isValid).length === 0}>
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
                : ' No valid assets were found in the preview to import.'
              }
              In a real application, this data would now be in your database.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">You can now navigate back to the assets list or start a new import.</p>
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

