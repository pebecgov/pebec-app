'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadProgress {
  status: 'idle' | 'parsing' | 'uploading' | 'complete' | 'error';
  processed: number;
  total: number;
  message?: string;
  batchId?: string;
}

interface ExcelUploaderProps {
  onUploadComplete?: (batchId: string, processedData: any[]) => void;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
  chunkSize?: number;
  showStats?: boolean;
  templateId?: string;
  className?: string;
}

export default function ExcelUploader({
  onUploadComplete,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  allowedExtensions = ['.xlsx', '.xls'],
  chunkSize = 1000,
  showStats = true,
  templateId,
  className = ""
}: ExcelUploaderProps) {
  const [progress, setProgress] = useState<UploadProgress>({
    status: 'idle',
    processed: 0,
    total: 0
  });
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadChunk = useMutation(api.excel.uploadChunk);
  const processBatch = useMutation(api.excel.processBatch);
  
  // Get upload stats if we have a batch ID
  const uploadStats = useQuery(
    api.excel.getUploadStats,
    currentBatchId ? { batchId: currentBatchId } : 'skip'
  );

  const validateFile = useCallback((file: File): string | null => {
    // Check file extension
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      return `Please upload a valid Excel file. Allowed extensions: ${allowedExtensions.join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  }, [allowedExtensions, maxFileSize]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setProgress({
        status: 'error',
        processed: 0,
        total: 0,
        message: validationError
      });
      return;
    }

    setProgress({ status: 'parsing', processed: 0, total: 0 });
    setProcessedData([]);

    try {
      // Create a web worker for parsing
      const workerInstance = new Worker('/workers/excelParser.js');
      setWorker(workerInstance);
      
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentBatchId(batchId);
      
      workerInstance.onmessage = async (event) => {
        const { type, data } = event.data;
        
        if (type === 'progress') {
          setProgress(prev => ({ 
            ...prev, 
            ...data,
            batchId: batchId
          }));
        } 
        else if (type === 'chunk') {
          // Upload chunk to Convex
          try {
            await uploadChunk({ 
              data: data.rows, 
              chunkIndex: data.chunkIndex,
              batchId: data.batchId,
              headers: data.headers,
              templateId: templateId as any
            });
            
            // Store processed data for callback
            setProcessedData(prev => [...prev, ...data.rows]);
            
            setProgress(prev => ({ 
              ...prev, 
              processed: data.processed,
              total: data.total,
              status: 'uploading',
              message: `Uploaded ${data.processed} of ${data.total} rows`
            }));
            
            // Request next chunk
            workerInstance.postMessage({ type: 'nextChunk' });
          } catch (error) {
            workerInstance.terminate();
            setWorker(null);
            setProgress({
              status: 'error',
              processed: 0,
              total: 0,
              message: 'Upload failed: ' + (error as Error).message
            });
          }
        }
        else if (type === 'complete') {
          workerInstance.terminate();
          setWorker(null);
          setProgress({ 
            status: 'complete', 
            processed: data.totalRows, 
            total: data.totalRows,
            batchId: data.batchId,
            message: 'Upload complete! Processing data...'
          });
          
          // Process the batch
          try {
            await processBatch({ 
              batchId: data.batchId,
              templateId: templateId as any
            });
            setProgress(prev => ({ 
              ...prev, 
              message: 'Data processed successfully!'
            }));
            
                         // Call callback if provided
             if (onUploadComplete) {
               onUploadComplete(data.batchId, processedData);
             }
             
             // Show pagination info for large datasets
             if (processedData.length > 1000) {
               const pages = Math.ceil(processedData.length / 500);
               toast.info(`Large dataset imported! Use pagination to navigate through ${pages} pages of data.`, {
                 duration: 5000,
               });
             }
          } catch (error) {
            setProgress(prev => ({ 
              ...prev, 
              status: 'error',
              message: 'Failed to process data: ' + (error as Error).message
            }));
          }
        }
        else if (type === 'error') {
          workerInstance.terminate();
          setWorker(null);
          setProgress({
            status: 'error',
            processed: 0,
            total: 0,
            message: data.message
          });
        }
      };

      // Start processing
      workerInstance.postMessage({ 
        type: 'start', 
        file,
        chunkSize,
        batchId
      });

    } catch (error) {
      setProgress({
        status: 'error',
        processed: 0,
        total: 0,
        message: 'Failed to process file: ' + (error as Error).message
      });
    }
  };

  const resetUpload = () => {
    if (worker) {
      worker.terminate();
      setWorker(null);
    }
    setProgress({ status: 'idle', processed: 0, total: 0 });
    setCurrentBatchId(null);
    setProcessedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cancelUpload = () => {
    if (worker) {
      worker.postMessage({ type: 'cancel' });
      worker.terminate();
      setWorker(null);
    }
    setProgress({ status: 'idle', processed: 0, total: 0 });
    setCurrentBatchId(null);
    setProcessedData([]);
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'parsing':
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'parsing':
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Excel File Uploader
        </CardTitle>
        <CardDescription>
          Upload and process Excel files with progress tracking and validation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Select Excel File
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={allowedExtensions.join(',')}
            disabled={progress.status === 'parsing' || progress.status === 'uploading'}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500">
            Supported formats: {allowedExtensions.join(', ')} | Max size: {Math.round(maxFileSize / (1024 * 1024))}MB
          </p>
        </div>

        {/* Progress Section */}
        {progress.status !== 'idle' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                </span>
              </div>
              {progress.status === 'parsing' || progress.status === 'uploading' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelUpload}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetUpload}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Upload Another
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {progress.total > 0 && (
              <div className="space-y-2">
                <Progress 
                  value={(progress.processed / progress.total) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{progress.processed.toLocaleString()} of {progress.total.toLocaleString()} rows</span>
                  <span>{Math.round((progress.processed / progress.total) * 100)}%</span>
                </div>
              </div>
            )}

            {/* Status Message */}
            {progress.message && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{progress.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Upload Stats */}
        {showStats && uploadStats && currentBatchId && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Statistics</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadStats.totalRows.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadStats.processedRows.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {uploadStats.pendingRows.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
            </div>
            {currentBatchId && (
              <div className="mt-2 text-center">
                <Badge variant="outline" className="text-xs">
                  Batch ID: {currentBatchId}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
