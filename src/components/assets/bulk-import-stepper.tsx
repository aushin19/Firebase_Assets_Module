// src/components/assets/bulk-import-stepper.tsx
"use client";

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileUp, Loader2, ListChecks, Eye, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Asset, AssetStatus, AssetType, Software } from '@/types';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type CSVRow = Record<string, string>;
type ColumnMapping = Record<keyof Asset, string | null>;

const ASSET_FIELDS_TO_MAP: (keyof Asset)[] = [
  'id', 'name', 'assetType', 'status', 'location', 'purchaseDate',
  'warrantyEndDate', 'assignedUser', 'department', 'ipAddress', 'macAddress',
  'operatingSystem', 'cpu', 'ram', 'storage', 'serialNumber', 'model',
  'manufacturer', 'notes', 'imageUrl', 'lastSeen', 'purchaseCost',
  'currentValue', 'retirementDate'
  // softwareList and knownVulnerabilities are too complex for direct CSV mapping in this version.
];

const REQUIRED_ASSET_FIELDS: (keyof Asset)[] = ['id', 'name', 'assetType', 'status'];

const ASSET_TYPE_VALUES: AssetType[] = ['Server', 'Workstation', 'Laptop', 'Router', 'Switch', 'Printer', 'MobileDevice', 'Other'];
const ASSET_STATUS_VALUES: AssetStatus[] = ['Active', 'Inactive', 'In Repair', 'Disposed', 'Missing', 'On Order'];


interface ValidatedAsset extends Partial<Asset> {
  _originalRow: CSVRow;
  _validationErrors: Record<string, string>;
  _isValid: boolean;
}

export function BulkImportStepper() {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({} as ColumnMapping);
  const [previewData, setPreviewData] = useState<ValidatedAsset[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const progressValue = (currentStep / 4) * 100;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast({ title: 'Invalid File Type', description: 'Please upload a CSV file.', variant: 'destructive' });
        setFile(null);
      }
    }
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
        // Auto-map common headers if possible (simple exact match)
        const initialMapping = {} as ColumnMapping;
        ASSET_FIELDS_TO_MAP.forEach(field => {
          const foundHeader = (results.meta.fields || []).find(h => h.toLowerCase() === field.toLowerCase());
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
    const validated: ValidatedAsset[] = csvData.slice(0, 10).map(row => { // Preview first 10 rows
      const asset: Partial<Asset> = {};
      const errors: Record<string, string> = {};
      let isValidOverall = true;

      ASSET_FIELDS_TO_MAP.forEach(assetField => {
        const csvHeader = columnMapping[assetField];
        if (csvHeader && row[csvHeader] !== undefined) {
          const value = row[csvHeader];
          // Basic Validation
          if (assetField === 'assetType' && !ASSET_TYPE_VALUES.includes(value as AssetType)) {
            errors[assetField] = `Invalid asset type: ${value}. Must be one of: ${ASSET_TYPE_VALUES.join(', ')}`;
            isValidOverall = false;
          } else if (assetField === 'status' && !ASSET_STATUS_VALUES.includes(value as AssetStatus)) {
            errors[assetField] = `Invalid status: ${value}. Must be one of: ${ASSET_STATUS_VALUES.join(', ')}`;
            isValidOverall = false;
          } else if ((assetField === 'purchaseCost' || assetField === 'currentValue') && isNaN(parseFloat(value))) {
            errors[assetField] = `${assetField} must be a number.`;
            isValidOverall = false;
            asset[assetField] = parseFloat(value) as any; // Keep the parsed attempt
          } else if (['purchaseDate', 'warrantyEndDate', 'lastSeen', 'retirementDate'].includes(assetField)) {
            if (isNaN(new Date(value).getTime())) {
              errors[assetField] = `${assetField} must be a valid date (e.g., YYYY-MM-DD).`;
              isValidOverall = false;
            }
             asset[assetField] = value; // Store as string, will be formatted by detail view
          }
          else {
            asset[assetField] = value as any;
            if (assetField === 'purchaseCost' || assetField === 'currentValue') {
              asset[assetField] = parseFloat(value) as any;
            }
          }
        } else if (REQUIRED_ASSET_FIELDS.includes(assetField)) {
            errors[assetField] = `${assetField} is required but not mapped or missing.`;
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
    // Simulate import
    // In a real app, this would send data to a backend API.
    // For now, we'll just count valid items from the preview for demonstration.
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
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMapping({} as ColumnMapping);
    setPreviewData([]);
    setCurrentStep(1);
  }


  return (
    <div className="space-y-8">
      <Progress value={progressValue} className="w-full mb-8" />
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><FileUp className="mr-2 h-6 w-6 text-primary"/>Step 1: Upload CSV File</CardTitle>
            <CardDescription>Select a CSV file containing the assets you want to import. Ensure the first row contains headers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept=".csv" onChange={handleFileChange} className="max-w-md" />
            {file && <p className="text-sm text-muted-foreground">Selected file: {file.name}</p>}
            <Alert>
              <ListChecks className="h-4 w-4" />
              <AlertTitle>CSV Format Guide</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>First row must be headers.</li>
                  <li>Required fields: `id`, `name`, `assetType`, `status`.</li>
                  <li>`assetType` must be one of: {ASSET_TYPE_VALUES.join(', ')}.</li>
                  <li>`status` must be one of: {ASSET_STATUS_VALUES.join(', ')}.</li>
                  <li>Dates (e.g., `purchaseDate`) should be in `YYYY-MM-DD` format.</li>
                  <li>Numerical fields (`purchaseCost`, `currentValue`) should contain only numbers.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={parseCSV} disabled={!file || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              Next: Map Columns
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Step 2: Map CSV Columns to Asset Fields</CardTitle>
            <CardDescription>Match the columns from your CSV file to the corresponding asset fields in AssetLens. Required fields are marked with an asterisk (*).</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {ASSET_FIELDS_TO_MAP.map(assetField => (
                <div key={assetField} className="space-y-1.5">
                  <label htmlFor={`map-${assetField}`} className="text-sm font-medium">
                    {assetField.charAt(0).toUpperCase() + assetField.slice(1)}
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
              ))}
            </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous: Upload
            </Button>
            <Button onClick={generatePreview} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Next: Preview Data
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
                    {ASSET_FIELDS_TO_MAP.filter(field => columnMapping[field]).map(field => (
                      <TableHead key={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</TableHead>
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
                      {ASSET_FIELDS_TO_MAP.filter(field => columnMapping[field]).map(assetField => (
                        <TableCell key={assetField}>
                          <div className="flex flex-col">
                            <span>{(item[assetField] as string) || <span className="italic text-muted-foreground">empty</span>}</span>
                            {item._validationErrors[assetField] && (
                              <span className="text-xs text-destructive">{item._validationErrors[assetField]}</span>
                            )}
                          </div>
                        </TableCell>
                      ))}
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
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isProcessing}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous: Map Columns
            </Button>
            <Button onClick={handleImport} disabled={isProcessing || previewData.length === 0}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Import Data (Simulated)
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
