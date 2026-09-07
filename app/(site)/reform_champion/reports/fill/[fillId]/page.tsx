// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Save, FileText, Trash2, Upload } from "lucide-react";
import * as XLSX from 'xlsx';
import ReportSubmissionSuccessDialog from "@/components/ReformChampion/ReportSubmissionSuccessDialog";
import {
  isAllowedReformChampionUpload,
  reformChampionUploadRejectedMessage,
} from "@/lib/reformChampionUpload";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function FillReportPage() {
  const { fillId } = useParams();
  const router = useRouter();
  const { user } = useUser();

  const validRoles = ["admin", "user", "mda", "staff", "reform_champion", "federal", "deputies", "magistrates", "state_governor", "president", "vice_president"] as const;
  type Role = typeof validRoles[number];

  const [template, setTemplate] = useState<null | {
    _id: Id<"report_templates">;
    title: string;
    description?: string;
    headers: {
      name: string;
      type: "text" | "number" | "textarea" | "dropdown" | "checkbox" | "date";
      options?: string[];
    }[];
    role: "admin" | "user" | "mda" | "staff" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president";
    createdBy: Id<"users">;
  }>(null);

  const [formData, setFormData] = useState<string[][]>([]);
  const [currentDraft, setCurrentDraft] = useState<Id<"submitted_reports"> | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const draftLoadedRef = useRef(false); // To ensure draft loads only once
  const [showExcelConfirm, setShowExcelConfirm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{
    currentChunk: number;
    totalChunks: number;
    processedRows: number;
    totalRows: number;
    isLargeDataset?: boolean;
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(300);
  const [totalPages, setTotalPages] = useState(1);
  const [showSubmissionSuccessDialog, setShowSubmissionSuccessDialog] = useState(false);
  const [submissionSuccessTitle, setSubmissionSuccessTitle] = useState("Report submitted successfully");


  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const convexUserId = convexUser?._id;

  // const availableReports = useQuery(api.internal_reports.getAvailableReports, convexUser?.role && validRoles.includes(convexUser.role as Role) ? { role: convexUser.role as Role } : "skip") ?? [];
  const availableReports = useQuery(
    api.internal_reports.getAvailableReports,
    convexUser?.role && convexUser?._id
      ? {
        role: convexUser.role,
        userId: convexUser._id,
      }
      : "skip"
  ) ?? [];
  const saveDraft = useMutation(api.internal_reports.saveDraftReport);
  const deleteDraft = useMutation(api.internal_reports.deleteDraftReport);
  const drafts = useQuery(api.internal_reports.getDraftReports, convexUserId && fillId ? { submittedBy: convexUserId, templateId: fillId as Id<"report_templates"> } : "skip") ?? [];

  const getTimelineForService = (service: string) => {
    const trimmedService = service.trim();
    switch (trimmedService) {
      case "CAC":
        return "10";
      case "Business-plan":
        return "14";
      case "Business-Name":
        return "7";
      default:
        return "";
    }
  };



  useEffect(() => {
    if (fillId && availableReports.length > 0) {
      const foundTemplate = availableReports.find(t => t._id === fillId);
      if (foundTemplate) {
        setTemplate(foundTemplate as typeof template);

        setFormData([foundTemplate.headers.map(() => "")]);
        draftLoadedRef.current = false;
        setCurrentDraft(null);
        setLastSavedAt(null);
      } else {
        toast.error("Report template not found.");
        router.push("/reform_champion/reports");
      }
    }
  }, [fillId, availableReports, router]);

  // Load draft data when drafts are available
  useEffect(() => {
    if (template && drafts.length > 0 && !draftLoadedRef.current && convexUserId) {
      const existingDraft = drafts.find(draft =>
        draft.templateId === template._id &&
        draft.submittedBy === convexUserId &&
        draft.isDraft === true
      );
      if (existingDraft && existingDraft.data && Array.isArray(existingDraft.data) && existingDraft.data.length > 0) {
        // Only load draft if it has data. Otherwise, keep the initial empty row.
        setFormData(existingDraft.data);
        setCurrentDraft(existingDraft._id);
        setLastSavedAt(new Date(existingDraft.updatedAt || existingDraft.submittedAt));
        draftLoadedRef.current = true;
      } else {
        // If no draft or empty draft, ensure one empty row is present
        if (template && formData.length === 0) {
          setFormData([template.headers.map(() => "")]);
        }
        draftLoadedRef.current = true; // Mark as loaded to prevent further checking
      }
    } else if (template && formData.length === 0 && !draftLoadedRef.current) {
      // If no drafts at all and form is empty, ensure it has one initial row
      setFormData([template.headers.map(() => "")]);
      draftLoadedRef.current = true;
    }
  }, [template, drafts, convexUserId, formData]); // Added formData to dependencies to react to its initial state

  const submitReport = useMutation(api.internal_reports.submitInternalReport);
  const matchHeadersWithAI = useAction(api.ai_helpers.matchExcelHeadersWithTemplate);

  // Add new mutations for large dataset handling
  const generateUploadUrl = useMutation(api.internal_reports.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const submitLargeReport = useMutation(api.internal_reports.submitLargeReport);

  const handleChange = (rowIndex: number, colIndex: number, value: string) => {
    setFormData(prev => {
      const updated = [...prev];
      // Ensure the row and cell exist before updating
      if (!updated[rowIndex]) {
        updated[rowIndex] = template?.headers.map(() => "") || [];
      }
      updated[rowIndex][colIndex] = value;
      return updated;
    });
  };

  const addRow = (autofill = false) => {
    if (!template) return;

    let newRow: string[];

    if (autofill && formData.length > 0) {
      // Use the last row's data as the template for the new row
      const lastRow = formData[formData.length - 1];
      newRow = [...lastRow];
    } else {
      // Empty row
      newRow = template.headers.map(() => "");
    }

    setFormData([...formData, newRow]);
  };

  const removeRow = (rowIndex: number) => {
    setFormData(prev => prev.filter((_, i) => i !== rowIndex));
  };


  const handleSaveDraft = async () => {
    if (!convexUserId || !template) {
      toast.error("User not found or template not loaded.");
      return;
    }

    try {
      // Show saving progress for large datasets
      if (formData.length > 500) {
        toast.info(`Saving draft with ${formData.length.toLocaleString()} rows...`, {
          duration: 2000,
        });
      }

      const draftId = await saveDraft({
        templateId: template._id,
        submittedBy: convexUserId as Id<"users">,
        role: template.role,
        data: formData,
        draftId: currentDraft || undefined
      });
      setCurrentDraft(draftId);
      setLastSavedAt(new Date());
      toast.success(`Draft saved successfully with ${formData.length.toLocaleString()} rows!`);
    } catch (error) {
      console.error("❌ Failed to save draft:", error);
      toast.error("Failed to save draft.");
    }
  };

  const handleSubmit = async () => {
    if (!convexUserId || !template) {
      toast.error("User not found or template not loaded.");
      return;
    }

    // Basic validation: Ensure at least one row exists and is not entirely empty
    const hasMeaningfulData = formData.some(row => row.some(cell => cell.trim() !== ''));
    if (formData.length === 0 || !hasMeaningfulData) {
      toast.error("Please fill in at least one row of data before submitting.");
      return;
    }

    // Show confirmation for large datasets
    if (formData.length > 1000) {
      const confirmed = window.confirm(
        `You are about to submit ${formData.length.toLocaleString()} rows of data.\n\n` +
        `This will submit ALL data across all pages, not just the current page.\n\n` +
        `Are you sure you want to continue?`
      );
      if (!confirmed) return;
    }

    try {
      const reportName = `${template.title}${reportTitle && reportTitle !== template.title ? ` (${reportTitle})` : ""}`;
      
      // Check if data is too large for Convex (limit is 8192 items)
      const CONVEX_ARRAY_LIMIT = 7000; // Leave some buffer
      const isLargeDataset = formData.length > CONVEX_ARRAY_LIMIT;

      if (isLargeDataset) {
        // Convert large dataset to Excel file and upload
        toast.info(`Large dataset detected (${formData.length.toLocaleString()} rows). Converting to Excel file...`, {
          duration: 3000,
        });

        // Convert form data to Excel file
        const workbook = XLSX.utils.book_new();
        
        // Convert data to the format expected by XLSX
        const excelData = formData.map(row => {
          const obj: Record<string, string> = {};
          template.headers.forEach((header, index) => {
            obj[header.name] = row[index] || '';
          });
          return obj;
        });
        
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Create file with proper name
        const fileName = `${reportName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        const excelFile = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Upload the Excel file
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": excelFile.type
          },
          body: excelFile
        });
        
        const { storageId } = await uploadResponse.json();
        await saveUploadedFile({
          storageId,
          fileName: excelFile.name
        });

        // Submit large report with file reference
        await submitLargeReport({
          templateId: template._id,
          submittedBy: convexUserId as Id<"users">,
          role: template.role,
          fileId: storageId as Id<"_storage">,
          fileName: excelFile.name,
          fileSize: excelFile.size / (1024 * 1024), // Convert to MB
          reportName: reportName,
          totalRows: formData.length
        });

        setSubmissionSuccessTitle(`Large report submitted successfully (${formData.length.toLocaleString()} rows)`);
        setShowSubmissionSuccessDialog(true);
        return;
      }

      // Show submission progress for large datasets
      if (formData.length > 500) {
        toast.info(`Submitting ${formData.length.toLocaleString()} rows of data...`, {
          duration: 3000,
        });
      }

      if (currentDraft) {
        await saveDraft({
          templateId: template._id,
          submittedBy: convexUserId as Id<"users">,
          role: template.role,
          data: formData,
          draftId: currentDraft
        });

        await submitReport({
          templateId: template._id,
          submittedBy: convexUserId as Id<"users">,
          role: template.role,
          data: formData,
          reportName: `${template.title}${reportTitle && reportTitle !== template.title ? ` (${reportTitle})` : ""}`
        });

        await deleteDraft({ draftId: currentDraft });
      } else {
        await submitReport({
          templateId: template._id,
          submittedBy: convexUserId as Id<"users">,
          role: template.role,
          data: formData,
          reportName: `${template.title}${reportTitle && reportTitle !== template.title ? ` (${reportTitle})` : ""}`
        });
      }

      setSubmissionSuccessTitle(`Report submitted successfully (${formData.length.toLocaleString()} rows)`);
      setShowSubmissionSuccessDialog(true);
    } catch (error) {
      console.error("Failed to submit report:", error);
      toast.error("Failed to submit report. Please check your data.");
    }
  };

  const handleDeleteDraft = async () => {
    if (!currentDraft) return;

    try {
      await deleteDraft({ draftId: currentDraft });
      setCurrentDraft(null);
      setLastSavedAt(null);
      if (template) {
        setFormData([template.headers.map(() => "")]);
      }
      toast.success("Draft deleted successfully!");
      setShowDraftDialog(false);
    } catch {
      toast.error("Failed to delete draft.");
    }
  };

    // Function to parse Excel data from all sheets (simple merge for same headers)
  const parseExcelFile = (file: File): Promise<{data: any[], sheetsProcessed: string[], allHeaders: string[]}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const allData: any[] = [];
        const sheetsProcessed: string[] = [];
        let allHeaders: string[] = [];
        
        // Process all sheets and merge rows directly
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
          
          // Filter out rows that are completely empty or have no meaningful data
          const filteredJson = json.filter(row => {
            return Object.values(row).some(value => {
              if (value === null || value === undefined) return false;
              const valueStr = String(value).trim();
              return valueStr.length > 0;
            });
          });
          
          // Only add data if the sheet has meaningful content
          if (filteredJson.length > 0) {
            console.log(`📊 Processing sheet "${sheetName}" with ${filteredJson.length} rows`);
            
            // Get headers from first sheet (assuming all sheets have same structure)
            if (allHeaders.length === 0 && filteredJson[0]) {
              allHeaders = Object.keys(filteredJson[0]);
              console.log(`📊 Headers from sheet "${sheetName}":`, allHeaders);
            }
            
            // Add all rows directly (no normalization needed for same headers)
            allData.push(...filteredJson);
            sheetsProcessed.push(sheetName);
            
            console.log(`📊 Sheet "${sheetName}": ${filteredJson.length} rows added to total dataset`);
          } else {
            console.log(`📊 Sheet "${sheetName}": No data (empty or all rows filtered out)`);
          }
        });
        
        console.log(`📊 Total combined data: ${allData.length} rows from ${sheetsProcessed.length} sheets`);
        console.log(`📊 Final headers:`, allHeaders);
        
        resolve({ data: allData, sheetsProcessed, allHeaders });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to process Excel data in chunks to keep UI responsive
  const processExcelDataInChunks = async (excelData: any[], headerMapping: Record<string, string>) => {
    const CHUNK_SIZE = 50; // Keep 50-row chunks as requested
    const QUARTER_SIZE = Math.ceil(excelData.length / 4); // Process 1/4 of rows at a time
    const totalRows = excelData.length;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);
    const processedData: string[][] = [];
    const isLargeDataset = totalRows > 1000;

    // Show progress for all datasets to ensure responsiveness
    setProcessingProgress({
      currentChunk: 0,
      totalChunks,
      processedRows: 0,
      totalRows,
      isLargeDataset
    });

    // Show processing mode
    toast.info(`Processing ${totalRows.toLocaleString()} rows in quarters with 10-second breaks for responsiveness.`, {
      duration: 3000,
    });

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const startIndex = chunkIndex * CHUNK_SIZE;
      const endIndex = Math.min(startIndex + CHUNK_SIZE, totalRows);
      const chunkData = excelData.slice(startIndex, endIndex);

      // Process this chunk
      const chunkProcessedData: string[][] = [];
      
      chunkData.forEach((excelRow: any) => {
        const newFormRow: string[] = template!.headers.map(() => "");

        template!.headers.forEach((templateHeader, colIndex) => {
          // Skip EXPECTED TIMELINE column as it's automatically calculated
          if (templateHeader.name === "EXPECTED TIMELINE") {
            newFormRow[colIndex] = ""; // Leave empty for automatic calculation
            return;
          }

          // Find the Excel header that maps to this template header
          const mappedExcelHeader = Object.keys(headerMapping).find(
            excelHeader => headerMapping[excelHeader] === templateHeader.name
          );

          if (mappedExcelHeader && excelRow[mappedExcelHeader] !== undefined) {
            const excelValue = excelRow[mappedExcelHeader];
            let processedValue = String(excelValue || '');

            // Process the value based on the template header type
            if (excelValue !== undefined && excelValue !== null) {
              switch (templateHeader.type) {
                case "number":
                  processedValue = String(parseFloat(excelValue) || 0);
                  break;
                case "checkbox":
                  processedValue = (String(excelValue).toLowerCase() === 'true' || 
                                  String(excelValue) === '1' || 
                                  String(excelValue).toLowerCase() === 'yes') ? "true" : "false";
                  break;
                case "date":
                  if (typeof excelValue === 'number') {
                    // Handle Excel date numbers
                    const date = new Date(Math.round((excelValue - 25569) * 86400 * 1000));
                    processedValue = date.toISOString().split('T')[0];
                  } else {
                    const date = new Date(excelValue);
                    if (!isNaN(date.getTime())) {
                      processedValue = date.toISOString().split('T')[0];
                    } else {
                      processedValue = '';
                    }
                  }
                  break;
                default:
                  processedValue = String(excelValue);
                  break;
              }
            }
            newFormRow[colIndex] = processedValue;
          }
        });

        chunkProcessedData.push(newFormRow);
      });

             // Add chunk data to processed data
       processedData.push(...chunkProcessedData);

       // Update progress
       setProcessingProgress({
         currentChunk: chunkIndex + 1,
         totalChunks,
         processedRows: processedData.length,
         totalRows,
         isLargeDataset
       });

       // Clear chunk data to free memory immediately
       chunkProcessedData.length = 0;

       // Check if we've processed 1/4 of the data
       const currentProcessedRows = processedData.length;
       const targetQuarter = Math.ceil(currentProcessedRows / QUARTER_SIZE);
       const isQuarterComplete = currentProcessedRows >= targetQuarter * QUARTER_SIZE && chunkIndex < totalChunks - 1;

                if (isQuarterComplete) {
           // Update the form with current quarter data
           if (formData.length === 1 && formData[0].every(cell => cell === "")) {
             setFormData([...processedData]);
           } else {
             setFormData(prev => {
               const existingData = prev.length === 1 && prev[0].every(cell => cell === "") ? [] : prev;
               return [...existingData, ...processedData];
             });
           }

           // Clear processed data to free memory
           processedData.length = 0;
           
           // Wait 10 seconds before continuing
           toast.info(`Quarter ${targetQuarter} complete! Processed ${currentProcessedRows.toLocaleString()} rows. Taking a 10-second break...`, {
             duration: 5000,
           });
           
           await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second break
           
           toast.info("Resuming processing...", {
             duration: 2000,
           });
         }

       // Final update if this is the last chunk
       if (chunkIndex === totalChunks - 1 && processedData.length > 0) {
         if (formData.length === 1 && formData[0].every(cell => cell === "")) {
           setFormData([...processedData]);
         } else {
           setFormData(prev => {
             const existingData = prev.length === 1 && prev[0].every(cell => cell === "") ? [] : prev;
             return [...existingData, ...processedData];
           });
         }
       }

       // Yield control back to the browser to prevent UI freezing
       if (chunkIndex < totalChunks - 1) {
         // Simple timeout for better performance
         await new Promise(resolve => setTimeout(resolve, 10));
       }
    }

    // Clear progress
    setProcessingProgress(null);

    return processedData;
  };


  function ExcelHeaderConfirm({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4">
        <div className="mb-4 text-blue-600 text-base font-semibold">
        </div>
        
        <div className="flex gap-4 mt-2 justify-center">
          <Button size="sm" onClick={onContinue}>Continue</Button>
          <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

         const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (!file || !template) {
       toast.error("No file selected or template not loaded.");
       return;
     }

     if (!isAllowedReformChampionUpload(file.name, file.type)) {
       toast.error(reformChampionUploadRejectedMessage(file.name));
       event.target.value = "";
       return;
     }

     setIsUploading(true);

         try {
      // First, get the headers from the Excel file (from all sheets)
      const parseResult = await parseExcelFile(file);
      if (parseResult.data.length === 0) {
        toast.error("The uploaded Excel file is empty or contains no valid data.");
        setIsUploading(false);
        return;
      }

      const { data: excelData, sheetsProcessed, allHeaders } = parseResult;
      const excelHeaders = allHeaders.length > 0 ? allHeaders : Object.keys(excelData[0] || {});
       
       // Use AI to match headers ONCE at the beginning
       toast.info("Matching Excel headers with template using AI...", { duration: 2000 });
       
       const aiResult = await matchHeadersWithAI({
         excelHeaders,
         templateHeaders: template.headers
       });

       if (!aiResult.success) {
         toast.error(`Header matching failed: ${aiResult.error}`);
         setIsUploading(false);
         return;
       }

       const { headerMapping, matchedHeaders, unmatchedTemplateHeaders } = aiResult;

       // Show mapping results to user
       const matchedCount = matchedHeaders?.length || 0;
       const totalTemplateHeaders = template.headers.length;
       const unmatchedCount = unmatchedTemplateHeaders?.length || 0;

       if (matchedCount === 0) {
         toast.error("Couldn't match any headers. Please check your Excel file format.");
         setIsUploading(false);
         return;
       }

             // Show mapping success and sheets processed
      toast.success(`AI matched ${matchedCount}/${totalTemplateHeaders} headers successfully!`, {
        duration: 3000,
      });

             // Show which sheets were processed
       if (sheetsProcessed.length > 1) {
         toast.info(`📊 Processed ${sheetsProcessed.length} sheets: ${sheetsProcessed.join(', ')}`, {
           duration: 5000,
         });
         
         // Show info about merged data
         toast.info(`📋 Merged ${excelData.length} total rows from all sheets`, {
           duration: 4000,
         });
       } else if (sheetsProcessed.length === 1) {
         toast.info(`📊 Processed sheet: ${sheetsProcessed[0]}`, {
           duration: 3000,
         });
       }

      if (unmatchedCount > 0) {
        toast.info(`${unmatchedCount} template headers couldn't be matched and will be left empty.`, {
          duration: 4000,
        });
      }

             // Show info about empty row filtering and sheet data distribution
      if (excelData.length > 0) {
        const originalRowCount = excelData.length;
        const filteredRowCount = excelData.filter(row => 
          Object.values(row).some(value => {
            if (value === null || value === undefined) return false;
            const valueStr = String(value).trim();
            return valueStr.length > 0;
          })
        ).length;
        
        if (originalRowCount !== filteredRowCount) {
          toast.info(`Filtered out ${originalRowCount - filteredRowCount} empty rows. Processing ${filteredRowCount} rows with data.`, {
            duration: 4000,
          });
        }
        
                 // Show data distribution across sheets
         if (sheetsProcessed.length > 1) {
           console.log(`📊 Data from multiple sheets:`, {
             totalRows: excelData.length,
             sheetsProcessed,
             allHeaders,
             sampleRow: excelData[0]
           });
           
           toast.info(`📋 Successfully merged ${excelData.length} rows from ${sheetsProcessed.length} sheets with same headers`, {
             duration: 5000,
           });
         }
      }

       // Now create web worker for processing data (without AI calls)
       const worker = new Worker('/workers/excelParser.js');
       
       worker.onmessage = async (event) => {
         const { type, data } = event.data;
         
         if (type === 'progress') {
           setProcessingProgress({
             currentChunk: 0,
             totalChunks: Math.ceil(data.total / 50),
             processedRows: data.processed,
             totalRows: data.total,
             isLargeDataset: data.total > 1000
           });
         } 
         else if (type === 'chunk') {
           // Process the chunk data using the pre-matched headers
           const excelData = data.rows;
           
           console.log(`🔍 Processing chunk with ${excelData.length} rows`);
           if (excelData.length > 0) {
             console.log(`🔍 Sample row from chunk:`, {
               headers: Object.keys(excelData[0]),
               values: Object.values(excelData[0]),
               headerMapping: headerMapping
             });
           }
           
           // Process this chunk with the pre-determined header mapping
           const chunkProcessedData = excelData.map((excelRow: any, rowIndex: number) => {
             const newFormRow: string[] = template.headers.map(() => "");

             template.headers.forEach((templateHeader, colIndex) => {
               // Skip EXPECTED TIMELINE column as it's automatically calculated
               if (templateHeader.name === "EXPECTED TIMELINE") {
                 newFormRow[colIndex] = ""; // Leave empty for automatic calculation
                 return;
               }

               // Find the Excel header that maps to this template header
               const mappedExcelHeader = Object.keys(headerMapping).find(
                 excelHeader => headerMapping[excelHeader] === templateHeader.name
               );

               if (mappedExcelHeader && excelRow[mappedExcelHeader] !== undefined) {
                 const excelValue = excelRow[mappedExcelHeader];
                 let processedValue = String(excelValue || '');

                 // Process the value based on the template header type
                 if (excelValue !== undefined && excelValue !== null) {
                   switch (templateHeader.type) {
                     case "number":
                       processedValue = String(parseFloat(excelValue) || 0);
                       break;
                     case "checkbox":
                       processedValue = (String(excelValue).toLowerCase() === 'true' || 
                                       String(excelValue) === '1' || 
                                       String(excelValue).toLowerCase() === 'yes') ? "true" : "false";
                       break;
                     case "date":
                       if (typeof excelValue === 'number') {
                         // Handle Excel date numbers
                         const date = new Date(Math.round((excelValue - 25569) * 86400 * 1000));
                         processedValue = date.toISOString().split('T')[0];
                       } else {
                         const date = new Date(excelValue);
                         if (!isNaN(date.getTime())) {
                           processedValue = processedValue;
                         } else {
                           processedValue = '';
                         }
                       }
                       break;
                     default:
                       processedValue = String(excelValue);
                       break;
                   }
                 }
                 
                 // Log the first few rows for debugging
                 if (rowIndex < 3) {
                   console.log(`🔍 Row ${rowIndex + 1} - ${templateHeader.name}: "${excelValue}" → "${processedValue}"`);
                 }
                 
                 newFormRow[colIndex] = processedValue;
               }
             });

             return newFormRow;
           });

           // Add processed data to form
           setFormData(prev => {
             const existingData = prev.length === 1 && prev[0].every(cell => cell === "") ? [] : prev;
             return [...existingData, ...chunkProcessedData];
           });

           // Update progress
           setProcessingProgress(prev => prev ? {
             ...prev,
             processedRows: data.processed,
             currentChunk: data.chunkIndex + 1
           } : null);

           // Request next chunk
           worker.postMessage({ type: 'nextChunk' });
         }
         else if (type === 'complete') {
           worker.terminate();
           setProcessingProgress(null);
           setIsUploading(false);
           
           console.log(`✅ Upload complete! Processed ${data.totalRows} rows`);
           console.log(`✅ Final form data length:`, formData.length);
           
           toast.success(`${data.totalRows} Rows imported successfully!`);
           
           // Show success message with mapping details
           setTimeout(() => {
             toast.info("Excel data processed and added to form successfully!", {
               duration: 3000,
             });
           }, 1000);
         }
         else if (type === 'error') {
           worker.terminate();
           setProcessingProgress(null);
           setIsUploading(false);
           toast.error(`Failed to process Excel file: ${data.message}`);
         }
       };

       // Start processing with the pre-matched headers
       worker.postMessage({ 
         type: 'start', 
         file,
         chunkSize: 50, // Process 50 rows at a time for better responsiveness
         batchId: `batch_${Date.now()}`,
         headerMapping: headerMapping // Pass the pre-matched headers to worker
       });

     } catch (error) {
       console.error("Error processing Excel file:", error);
       toast.error("Failed to process Excel file. Please ensure it's in the correct format.");
       setIsUploading(false);
     }
     
     event.target.value = '';
   };

  const currentMonth = MONTHS[new Date().getMonth()];
  const [reportTitle, setReportTitle] = useState(currentMonth);



  useEffect(() => {
    setReportTitle(currentMonth);
  }, [template]); // Reset when template changes

  // Calculate pagination when formData changes
  useEffect(() => {
    if (formData.length > 0) {
      const total = formData.length;
      const pages = Math.ceil(total / rowsPerPage);
      setTotalPages(pages);
      
      // Reset to first page if current page is beyond total pages
      if (currentPage > pages) {
        setCurrentPage(1);
      }
    } else {
      setTotalPages(1);
      setCurrentPage(1);
    }
  }, [formData, rowsPerPage, currentPage]);

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return formData.slice(startIndex, endIndex);
  };

  const currentPageData = getCurrentPageData();

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (formData.length <= rowsPerPage) return; // Only enable if pagination is needed
      
      if (event.key === 'ArrowLeft' && event.ctrlKey) {
        event.preventDefault();
        setCurrentPage(prev => Math.max(1, prev - 1));
      } else if (event.key === 'ArrowRight' && event.ctrlKey) {
        event.preventDefault();
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      } else if (event.key === 'Home' && event.ctrlKey) {
        event.preventDefault();
        setCurrentPage(1);
      } else if (event.key === 'End' && event.ctrlKey) {
        event.preventDefault();
        setCurrentPage(totalPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData.length, rowsPerPage, totalPages]);

  // Function to download Excel with headers
  const handleDownloadTemplateExcel = () => {
    if (!template) return;
    const ws = XLSX.utils.aoa_to_sheet([template.headers.map(h => h.name)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${reportTitle || "Report"}_template.xlsx`);
  };

  if (!template) return <p className="text-center p-6 text-gray-500">Loading Report...</p>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md overflow-x-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
          {/* Editable report title input */}
          <div className="mb-2">
            <label className="block text-gray-700 font-medium mb-1">Report Month</label>
            <Select value={reportTitle} onValueChange={setReportTitle}>
              <SelectTrigger className="w-[320px]  text-1xl">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
                     <p className="text-gray-600">{template.description}</p>
                       {currentDraft && lastSavedAt && (
              <p className="text-sm text-green-600 mt-1">
                💾 Draft saved at {lastSavedAt.toLocaleString()}
              </p>
            )}
            
                         {processingProgress && (
               <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                 <div className="flex items-center justify-between mb-2">
                   
                   <span className="text-sm text-blue-600">
                     {Math.round((processingProgress.processedRows / processingProgress.totalRows) * 100)}%
                   </span>
                 </div>
                 <div className="w-full bg-blue-200 rounded-full h-2">
                   <div 
                     className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                     style={{ width: `${(processingProgress.processedRows / processingProgress.totalRows) * 100}%` }}
                   ></div>
                 </div>
                 <p className="text-xs text-blue-600 mt-1">
                   Processed {processingProgress.processedRows.toLocaleString()} of {processingProgress.totalRows.toLocaleString()} rows
                 </p>
                            <p className="text-xs text-blue-500 mt-1">
             ⚡ Processing in 50-row chunks
           </p>
           <p className="text-xs text-blue-400 mt-1">
             💡 Please don't close this page during processing
           </p>
                       <p className="text-xs text-green-600 mt-1">
              📄 Table shows 300 rows per page for better performance
            </p>
          
               </div>
             )}
            
         </div>
        <div className="flex gap-2">
          {/* Download Excel template button */}
          <Button variant="outline" onClick={handleDownloadTemplateExcel}>
            <FileText className="w-4 h-4 mr-1" />
            Download Excel Template
          </Button>
          <Button variant="outline" onClick={() => router.back()}>← Go Back</Button>
          {currentDraft && (
            <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-1" />
                  Draft Options
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Draft Management</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    You have a saved draft for this report. Last saved: {lastSavedAt?.toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDeleteDraft}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Draft
                    </Button>
                    <Button onClick={() => setShowDraftDialog(false)}>Close</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

             <div className="overflow-x-auto">
         {/* Pagination Info */}
         {formData.length > rowsPerPage && (
           <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
             <div className="flex items-center justify-between">
               <div className="text-sm text-gray-600">
                 Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, formData.length)} of {formData.length.toLocaleString()} rows
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                 <div className="flex gap-1">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                     className="px-2 py-1"
                   >
                     ←
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     disabled={currentPage === totalPages}
                     className="px-2 py-1"
                   >
                     →
                   </Button>
                 </div>
               </div>
             </div>
           </div>
         )}

         <Table className="mb-4 min-w-max">
           <TableHeader>
             <TableRow>
               <TableHead className="w-[40px]">#</TableHead> {/* Serial number column */}
               {template.headers.map((header, index) => (
                 <TableHead key={index}>{header.name}</TableHead>
               ))}
               <TableHead className="w-[50px]">Actions</TableHead>
             </TableRow>
           </TableHeader>

           <TableBody>
             {currentPageData.map((row, rowIndex) => {
               const actualRowIndex = (currentPage - 1) * rowsPerPage + rowIndex;
              const serviceProvidedIndex = template.headers.findIndex(h => h.name === "SERVICE PROVIDED");
              const expectedTimelineIndex = template.headers.findIndex(h => h.name === "EXPECTED TIMELINE");
              const dateSubmissionIndex = template.headers.findIndex(h => h.name === "DATE OF SUBMISSION");

              const serviceProvidedValue = row[serviceProvidedIndex]?.trim();
              const dateSubmissionValue = row[dateSubmissionIndex]?.trim();

              // Only assign timeline if service and date submission are both filled
              if (serviceProvidedValue && dateSubmissionValue && expectedTimelineIndex !== -1) {
                const timelineValue = getTimelineForService(serviceProvidedValue);
                if (timelineValue && !row[expectedTimelineIndex]) {
                  row[expectedTimelineIndex] = timelineValue;
                }
              }
                             return (
                 <TableRow key={actualRowIndex}>
                   <TableCell className="font-bold">{actualRowIndex + 1}</TableCell>
                  {row.map((cell, colIndex) => {
                    const header = template.headers[colIndex];
                    const isTimelineColumn = header.name === "EXPECTED TIMELINE";
                    const isServiceColumn = header.name === "SERVICE PROVIDED";
                    const isDateSubmissionColumn = header.name === "DATE OF SUBMISSION";

                    if (isTimelineColumn) {
                      return (
                        <TableCell key={colIndex}>
                          <Input
                            value={row[colIndex] || ""}
                            readOnly
                            className="bg-gray-100 cursor-not-allowed"
                          />
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={colIndex}>
                        {header.type === "dropdown" ? (
                          <Select
                            value={cell || ""}
                                                       onValueChange={val => {
                     handleChange(actualRowIndex, colIndex, val);
                     if (isServiceColumn && expectedTimelineIndex !== -1) {
                       const dateSubmission = row[dateSubmissionIndex]?.trim();
                       if (dateSubmission) {
                         const timelineValue = getTimelineForService(val);
                         handleChange(actualRowIndex, expectedTimelineIndex, timelineValue);
                       }
                     }
                   }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {header.options?.map((option, i) => (
                                <SelectItem key={i} value={option.trim()}>{option.trim()}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                                                 ) : header.type === "textarea" ? (
                           <Textarea value={cell || ""} onChange={e => handleChange(actualRowIndex, colIndex, e.target.value)} />
                         ) : header.type === "checkbox" ? (
                           <input
                             type="checkbox"
                             checked={cell === "true"}
                             onChange={e => handleChange(actualRowIndex, colIndex, e.target.checked ? "true" : "false")}
                             className="w-5 h-5 cursor-pointer"
                           />
                         ) : header.type === "date" ? (
                           <Input
                             type="date"
                             value={cell || ""}
                             onChange={e => handleChange(actualRowIndex, colIndex, e.target.value)}
                           />
                         ) : (
                           <Input
                             type={header.type === "number" ? "number" : "text"}
                             value={cell || ""}
                             onChange={e => handleChange(actualRowIndex, colIndex, e.target.value)}
                           />
                         )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                                         <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => removeRow(actualRowIndex)}
                       className="text-red-500 hover:text-red-600"
                       disabled={formData.length <= 1}
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>



        </Table>
      </div>

             <div className="flex flex-wrap gap-2 mb-4 items-center">
                   {/* Pagination Controls */}
          {formData.length > rowsPerPage && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-600">Go to page:</span>
              <Select value={currentPage.toString()} onValueChange={(value) => setCurrentPage(parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <SelectItem key={page} value={page.toString()}>
                      {page}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">of {totalPages}</span>
              
              {/* Quick navigation buttons */}
              <div className="flex gap-1 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs"
                  title="First page"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs"
                  title="Previous page"
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs"
                  title="Next page"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs"
                  title="Last page"
                >
                  »
                </Button>
              </div>
            </div>
          )}

         <Button 
           onClick={() => addRow(false)} 
           variant="outline"
           disabled={isUploading}
         >
           ➕ Add Empty Row
         </Button>
        {/* <Button
          onClick={() => addRow(true)}
          variant="outline"
          disabled={formData.length === 0}
        >
          📋 Add Row with Previous Data
        </Button> */}
        {/* <div className="border rounded-md bg-gray-50 flex items-center gap-2">

          <label htmlFor="excel-file-upload" className="flex items-center justify-center px-2 py-1 border border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
            <Upload  className="w-4 h-4 mr-1" /> Bulk Upload
            <input
              id="excel-file-upload"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>

        </div> */}
        <div className="border rounded-md bg-gray-50 flex items-center gap-2">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isUploading}
            className={`flex items-center justify-center px-2 py-1 border border-gray-300 bg-white text-gray-800 rounded-md transition-colors ${
              isUploading 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover:bg-gray-100'
            }`}
          >
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? 'Uploading...' : 'Bulk Upload'}
          </button>

          <input
            ref={fileInputRef}
            id="excel-file-upload"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleExcelUpload}
            className="hidden"
          />
        </div>

        {showConfirmModal && (
          <Dialog open onOpenChange={setShowConfirmModal}>
            <DialogContent>
              <DialogTitle className="text-lg text-center font-bold text-blue-600">
              Excel Bulk Upload
              </DialogTitle>
              <ExcelHeaderConfirm
                onContinue={() => {
                  setShowConfirmModal(false);
                  fileInputRef.current?.click(); // open file picker after confirm
                }}
                onCancel={() => setShowConfirmModal(false)}
              />
            </DialogContent>
          </Dialog>
        )}
                 <Button
           onClick={handleSaveDraft}
           variant="outline"
           className="flex items-center gap-1"
           disabled={isUploading}
         >
           <Save className="w-4 h-4" />
           Save as Draft
         </Button>
        
      </div>
             <div className="flex gap-2">
         <Button 
           onClick={handleSubmit} 
           className="bg-green-600 text-white"
           disabled={isUploading}
         >
           ✅ Submit Report
         </Button>
         
       </div>
      <Dialog open={showExcelConfirm} onOpenChange={setShowExcelConfirm}>
        <DialogContent className="max-w-md w-full p-6 rounded-lg flex flex-col items-center text-center">
          <DialogTitle className="text-lg font-bold text-blue-600 mb-2">Excel Upload</DialogTitle>
          <div className="mb-4 text-blue-600 text-base font-semibold">
            System will automatically match your Excel headers with the template headers!
          </div>
      
          <div className="flex gap-4 mt-2 justify-center">
            <Button
              size="sm"
              onClick={() => {
                setShowExcelConfirm(false);
                if (fileInputRef.current) fileInputRef.current.click();
              }}
            >
              Continue
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExcelConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReportSubmissionSuccessDialog
        open={showSubmissionSuccessDialog}
        onOpenChange={setShowSubmissionSuccessDialog}
        onConfirm={() => router.push("/reform_champion/reports")}
        title={submissionSuccessTitle}
      />
    </div>
  );
}