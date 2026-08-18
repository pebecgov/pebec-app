"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { indicators } from "@/convex/config/indicators";

interface ScoreRow {
  state: string;
  indicator: string;
  subIndicator: string;
  value: string;
  linkToSource?: string;
}

export default function BulkImportStateScores() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ScoreRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [importResults, setImportResults] = useState<{
    imported: number;
    errors: number;
    errorMessages: string[];
  } | null>(null);

  const bulkImport = useMutation(api.bulkImportStateScores.bulkImportStateScores);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setImportResults(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

      if (rows.length < 2) {
        toast.error("Excel file must have at least a header row and one data row");
        setIsProcessing(false);
        return;
      }

      // Parse rows - adjust column indices based on your Excel structure
      // Expected format: [State, Indicator Key, SubIndicator Key, Value, LinkToSource?]
      const scores: ScoreRow[] = [];
      const errors: string[] = [];

      // Get indicator keys for validation
      const indicatorKeys = Object.keys(indicators);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((cell: any) => !cell || String(cell).trim() === "")) continue;

        const state = String(row[0] || "").trim();
        const indicator = String(row[1] || "").trim();
        const subIndicator = String(row[2] || "").trim();
        const value = String(row[3] || "").trim();
        const linkToSource = row[4] ? String(row[4]).trim() : undefined;

        // Validation
        if (!state) {
          errors.push(`Row ${i + 1}: Missing state name`);
          continue;
        }
        if (!indicator || !indicatorKeys.includes(indicator)) {
          errors.push(`Row ${i + 1}: Invalid indicator key "${indicator}"`);
          continue;
        }
        if (!subIndicator) {
          errors.push(`Row ${i + 1}: Missing sub-indicator key`);
          continue;
        }
        if (!value) {
          errors.push(`Row ${i + 1}: Missing value`);
          continue;
        }

        scores.push({
          state,
          indicator,
          subIndicator,
          value,
          linkToSource: linkToSource || undefined,
        });
      }

      if (errors.length > 0) {
        toast.warning(`Found ${errors.length} validation errors. Check console for details.`);
        console.error("Validation errors:", errors);
      }

      setParsedData(scores);
      toast.success(`Parsed ${scores.length} valid scores from ${rows.length - 1} rows`);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse Excel file. Please check the format.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (parsedData.length === 0) {
      toast.error("No data to import");
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      // Import in batches of 50
      const batchSize = 50;
      let totalImported = 0;
      let totalErrors = 0;
      const allErrorMessages: string[] = [];

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize);
        try {
          const result = await bulkImport({ scores: batch, year: selectedYear });
          totalImported += result.imported;
          totalErrors += result.errors;
          allErrorMessages.push(...result.errorMessages);
        } catch (error) {
          console.error(`Error importing batch ${Math.floor(i / batchSize) + 1}:`, error);
          totalErrors += batch.length;
        }
      }

      setImportResults({
        imported: totalImported,
        errors: totalErrors,
        errorMessages: allErrorMessages,
      });

      if (totalErrors === 0) {
        toast.success(`Successfully imported ${totalImported} scores!`);
      } else {
        toast.warning(
          `Imported ${totalImported} scores with ${totalErrors} errors. Check details below.`
        );
      }
    } catch (error) {
      console.error("Error importing scores:", error);
      toast.error("Failed to import scores");
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, bulkImport]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Import State Scores
        </CardTitle>
        <CardDescription>
          Upload an Excel file to import state scores in bulk. Expected format: State | Indicator Key | SubIndicator Key | Value | Link (optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Excel File (.xlsx, .xls, .csv)</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={isProcessing || isImporting}
            />
            <p className="text-xs text-muted-foreground">
              Columns: State | Indicator Key | SubIndicator Key | Value | Link to Source (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment-year">Assessment Year</Label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {[2026, 2025, 2024, 2023, 2022].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            Processing file...
          </div>
        )}

        {parsedData.length > 0 && !isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                Ready to import: {parsedData.length} scores
              </span>
              <Button onClick={handleImport} size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import All
              </Button>
            </div>
          </div>
        )}

        {isImporting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            Importing scores...
          </div>
        )}

        {importResults && (
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {importResults.errors === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <div>
                <p className="font-medium">
                  Imported: {importResults.imported} | Errors: {importResults.errors}
                </p>
              </div>
            </div>
            {importResults.errorMessages.length > 0 && (
              <details className="mt-2">
                <summary className="text-sm cursor-pointer text-muted-foreground">
                  View error details ({importResults.errorMessages.length})
                </summary>
                <ul className="mt-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                  {importResults.errorMessages.map((msg, idx) => (
                    <li key={idx} className="text-red-600">{msg}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">Example Indicator Keys:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>access_to_electricity</li>
            <li>infrastructure</li>
            <li>digital_connectivity</li>
            <li>land_registration</li>
            <li>... (see indicators config for full list)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

