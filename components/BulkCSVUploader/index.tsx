// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, MapPin, Plus, Save, CheckCircle, AlertTriangle } from "lucide-react";

interface Template {
  _id: string;
  title: string;
  headers: {
    name: string;
    type: "text" | "number" | "textarea" | "dropdown" | "checkbox" | "date";
    options?: string[];
  }[];
}

interface BulkCSVUploaderProps {
  template: Template;
  existingData: string[][];
  onDataUpdate: (newData: string[][]) => void;
  onSaveDraft: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  csvColumn: string;
  templateField: number;
  fieldType: string;
}

interface ParsedCSV {
  headers: string[];
  data: CSVRow[];
  rawData: string[][];
}

export default function BulkCSVUploader({ 
  template, 
  existingData, 
  onDataUpdate, 
  onSaveDraft,
  isOpen, 
  onClose 
}: BulkCSVUploaderProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'map' | 'preview' | 'confirm'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  // Simple CSV parser to replace Papa Parse
  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n');
    const result: string[][] = [];
    
    for (let line of lines) {
      if (line.trim() === '') continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      row.push(current.trim());
      result.push(row);
    }
    
    return result;
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }

    setCsvFile(file);

    // Read and parse CSV with FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        
        if (data.length < 2) {
          toast.error("CSV must have at least a header row and one data row");
          return;
        }

        const headers = data[0].map(h => h.trim());
        const rows = data.slice(1).filter(row => row.some(cell => cell.trim() !== ""));

        const csvData: CSVRow[] = rows.map(row => {
          const obj: CSVRow = {};
          headers.forEach((header, index) => {
            obj[header] = (row[index] || "").trim();
          });
          return obj;
        });

        setParsedCSV({
          headers,
          data: csvData,
          rawData: data
        });

        // Auto-map columns with similar names
        const autoMappings: ColumnMapping[] = [];
        headers.forEach(csvHeader => {
          const matchingFieldIndex = template.headers.findIndex(templateField =>
            templateField.name.toLowerCase().includes(csvHeader.toLowerCase()) ||
            csvHeader.toLowerCase().includes(templateField.name.toLowerCase())
          );

          if (matchingFieldIndex !== -1) {
            autoMappings.push({
              csvColumn: csvHeader,
              templateField: matchingFieldIndex,
              fieldType: template.headers[matchingFieldIndex].type
            });
          }
        });

        setColumnMappings(autoMappings);
        setCurrentStep('map');
        toast.success(`CSV parsed successfully! Found ${rows.length} data rows`);
      } catch (error) {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file");
      }
    };
    
    reader.readAsText(file);
  }, [template]);

  const updateColumnMapping = (csvColumn: string, templateFieldIndex: number) => {
    setColumnMappings(prev => {
      const existing = prev.find(m => m.csvColumn === csvColumn);
      const newMapping: ColumnMapping = {
        csvColumn,
        templateField: templateFieldIndex,
        fieldType: template.headers[templateFieldIndex].type
      };

      if (existing) {
        return prev.map(m => m.csvColumn === csvColumn ? newMapping : m);
      } else {
        return [...prev, newMapping];
      }
    });
  };

  const removeColumnMapping = (csvColumn: string) => {
    setColumnMappings(prev => prev.filter(m => m.csvColumn !== csvColumn));
  };

  const generatePreview = () => {
    if (!parsedCSV) return;

    try {
      const mappedData: string[][] = parsedCSV.data.map(row => {
        const mappedRow: string[] = new Array(template.headers.length).fill("");
        
        columnMappings.forEach(mapping => {
          const csvValue = row[mapping.csvColumn] || "";
          let convertedValue = csvValue;

          // Convert value based on field type
          switch (mapping.fieldType) {
            case "number":
              const num = parseFloat(csvValue);
              convertedValue = isNaN(num) ? "" : num.toString();
              break;
            case "checkbox":
              convertedValue = ["true", "yes", "1", "checked"].includes(csvValue.toLowerCase()) ? "true" : "false";
              break;
            case "date":
              if (csvValue) {
                const date = new Date(csvValue);
                convertedValue = isNaN(date.getTime()) ? csvValue : date.toISOString().split('T')[0];
              }
              break;
            default:
              convertedValue = csvValue;
          }

          mappedRow[mapping.templateField] = convertedValue;
        });

        return mappedRow;
      });

      setPreviewData(mappedData);
      setCurrentStep('preview');
      toast.success(`Preview generated for ${mappedData.length} rows`);
    } catch (error) {
      console.error("Preview generation error:", error);
      toast.error("Failed to generate preview");
    }
  };

  const addToExistingData = async () => {
    setIsProcessing(true);
    try {
      const newData = [...existingData, ...previewData];
      onDataUpdate(newData);
      
      // Auto-save as draft
      await onSaveDraft();
      
      toast.success(`Added ${previewData.length} rows to your report! Draft saved automatically.`);
      setCurrentStep('confirm');
    } catch (error) {
      console.error("Failed to add data:", error);
      toast.error("Failed to add data to report");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUploader = () => {
    setCsvFile(null);
    setParsedCSV(null);
    setColumnMappings([]);
    setPreviewData([]);
    setCurrentStep('upload');
  };

  const handleClose = () => {
    resetUploader();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Bulk CSV Upload for {template.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[
              { step: 'upload', label: 'Upload CSV', icon: Upload },
              { step: 'map', label: 'Map Columns', icon: MapPin },
              { step: 'preview', label: 'Preview Data', icon: FileText },
              { step: 'confirm', label: 'Confirm', icon: CheckCircle }
            ].map(({ step, label, icon: Icon }) => (
              <div 
                key={step}
                className={`flex items-center gap-2 ${
                  currentStep === step ? 'text-blue-600' : 
                  ['upload', 'map', 'preview', 'confirm'].indexOf(currentStep) > 
                  ['upload', 'map', 'preview', 'confirm'].indexOf(step) ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Upload Step */}
          {currentStep === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium">Upload CSV File</p>
                      <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-2">Max file size: 10MB</p>
                    </label>
                  </div>
                  
                  {csvFile && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">{csvFile.name}</span>
                      <Badge variant="secondary">{(csvFile.size / 1024).toFixed(1)} KB</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column Mapping Step */}
          {currentStep === 'map' && parsedCSV && (
            <Card>
              <CardHeader>
                <CardTitle>Map CSV Columns to Template Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">CSV Columns ({parsedCSV.headers.length})</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {parsedCSV.headers.map(header => (
                          <div key={header} className="flex items-center justify-between p-2 border rounded">
                            <span className="font-medium">{header}</span>
                            <div className="flex items-center gap-2">
                              <Select
                                value={columnMappings.find(m => m.csvColumn === header)?.templateField.toString() || ""}
                                onValueChange={(value) => {
                                  if (value === "") {
                                    removeColumnMapping(header);
                                  } else {
                                    updateColumnMapping(header, parseInt(value));
                                  }
                                }}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No mapping</SelectItem>
                                  {template.headers.map((field, index) => (
                                    <SelectItem key={index} value={index.toString()}>
                                      {field.name} ({field.type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Template Fields ({template.headers.length})</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {template.headers.map((field, index) => {
                          const isMapped = columnMappings.some(m => m.templateField === index);
                          return (
                            <div key={index} className={`p-2 border rounded ${isMapped ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{field.name}</span>
                                <Badge variant={isMapped ? "default" : "secondary"}>
                                  {field.type}
                                </Badge>
                              </div>
                              {isMapped && (
                                <p className="text-xs text-green-600 mt-1">
                                  Mapped to: {columnMappings.find(m => m.templateField === index)?.csvColumn}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      {columnMappings.length} columns mapped. Unmapped template fields will be left empty.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Step */}
          {currentStep === 'preview' && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Data ({previewData.length} rows)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="max-h-64 overflow-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {template.headers.map((header, index) => (
                            <TableHead key={index} className="min-w-32">
                              {header.name}
                              <Badge variant="outline" className="ml-1 text-xs">
                                {header.type}
                              </Badge>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="text-sm">
                                {cell || <span className="text-gray-400">Empty</span>}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {previewData.length > 10 && (
                    <p className="text-sm text-gray-500 text-center">
                      Showing first 10 rows of {previewData.length} total rows
                    </p>
                  )}

                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">
                      Ready to add {previewData.length} rows to your existing {existingData.length} rows
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation Step */}
          {currentStep === 'confirm' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Successfully Added Data!</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">
                        Added {previewData.length} rows to your report
                      </p>
                      <p className="text-sm text-green-600">
                        Total rows: {existingData.length} | Draft saved automatically
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={resetUploader} variant="outline">
                      Upload Another CSV
                    </Button>
                    <Button onClick={handleClose}>
                      Done
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          {currentStep === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {currentStep === 'map' && (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={generatePreview}
                disabled={columnMappings.length === 0}
              >
                Generate Preview
              </Button>
            </>
          )}
          
          {currentStep === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('map')}>
                Back to Mapping
              </Button>
              <Button 
                onClick={addToExistingData}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Adding Data...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Report & Save Draft
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 