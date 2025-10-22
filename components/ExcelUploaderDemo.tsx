'use client';

import { useState } from 'react';
import ExcelUploader from './ExcelUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ExcelUploaderDemoProps {
  templateId?: string;
  onDataProcessed?: (data: any[]) => void;
}

export default function ExcelUploaderDemo({ templateId, onDataProcessed }: ExcelUploaderDemoProps) {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);

  const handleUploadComplete = (batchId: string, processedData: any[]) => {
    setCurrentBatchId(batchId);
    setUploadedData(processedData);
    
    // Call the callback if provided
    if (onDataProcessed) {
      onDataProcessed(processedData);
    }
    
    toast.success(`Successfully processed ${processedData.length} rows from Excel file!`);
  };

  return (
    <div className="space-y-6">
      {/* Excel Uploader Component */}
      <ExcelUploader
        onUploadComplete={handleUploadComplete}
        templateId={templateId}
        maxFileSize={50 * 1024 * 1024} // 50MB
        chunkSize={500} // Process 500 rows at a time
        showStats={true}
        className="mb-6"
      />

      {/* Upload Results */}
      {uploadedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {uploadedData.length} Rows Processed
              </Badge>
              Upload Results
            </CardTitle>
            <CardDescription>
              Data successfully imported from Excel file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sample Data Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Data (First 3 rows):</h4>
                <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                  <pre className="text-xs text-gray-600">
                    {JSON.stringify(uploadedData.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>

              {/* Batch Information */}
              {currentBatchId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Batch ID:</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {currentBatchId}
                  </Badge>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedData([]);
                    setCurrentBatchId(null);
                  }}
                >
                  Clear Data
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // You can add additional processing here
                    toast.info("Data ready for further processing!");
                  }}
                >
                  Process Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click "Select Excel File" to choose your Excel file (.xlsx or .xls)</li>
            <li>The system will automatically parse the file using a web worker (no UI blocking)</li>
            <li>Data is processed in chunks to maintain responsiveness</li>
            <li>Progress is shown in real-time with detailed statistics</li>
            <li>Processed data is stored in the database and available for further use</li>
            <li>You can cancel the upload at any time</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
