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
      const draftId = await saveDraft({
        templateId: template._id,
        submittedBy: convexUserId as Id<"users">,
        role: template.role,
        data: formData,
        draftId: currentDraft || undefined
      });
      setCurrentDraft(draftId);
      setLastSavedAt(new Date());
      toast.success("Draft saved successfully!");
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

    try {
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

      toast.success("Report submitted successfully!");
      router.push("/reform_champion/reports");
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

  // Function to parse Excel data (re-used from previous discussion)
  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // Get the first sheet
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet); // Convert to JSON
        resolve(json);
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
          <Button size="sm" onClick={onContinue}>Continue with AI</Button>
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

    setIsUploading(true);

    try {
      const excelData = await parseExcelFile(file);
      if (excelData.length === 0) {
        toast.info("The uploaded Excel file is empty.");
        return;
      }

             const excelHeaders = Object.keys(excelData[0] || {});
       
       // Show warning for very large datasets
       if (excelData.length > 10000) {
         toast.info(`Large dataset detected (${excelData.length.toLocaleString()} rows). Processing will be done in small chunks to maintain responsiveness.`, {
           duration: 4000,
         });
       }
       
       // Use AI to match headers only
       toast.info("Matching Excel headers with template headers...");
      
      const aiResult = await matchHeadersWithAI({
        excelHeaders,
        templateHeaders: template.headers
      });

      if (!aiResult.success) {
        toast.error(`Header matching failed: ${aiResult.error}`);
        return;
      }

      const { headerMapping, matchedHeaders, unmatchedTemplateHeaders } = aiResult;

      // Show mapping results to user
      const matchedCount = matchedHeaders?.length || 0;
      const totalTemplateHeaders = template.headers.length;
      const unmatchedCount = unmatchedTemplateHeaders?.length || 0;

      let message = `✅ Matched ${matchedCount}/${totalTemplateHeaders} Template headers successfully!`;
      
      if (unmatchedCount > 0 && unmatchedTemplateHeaders) {
        message += `\n⚠️ ${unmatchedCount} Template headers couldn't be matched: ${unmatchedCount > 3 ? unmatchedTemplateHeaders.slice(0, 3).join(', ') + '...' : unmatchedTemplateHeaders.join(', ')}`;
      }

      if (matchedCount === 0) {
        toast.error("Couldn't match any headers. Please check your Excel file format.");
        return;
      }

             // Process data locally using the header mapping
       toast.info(`Processing ${excelData.length.toLocaleString()} rows locally...`);
       
       const processedData = await processExcelDataInChunks(excelData, headerMapping);
      
      toast.success(`${processedData.length} Rows imported successfully using AI header matching!`);
      
      // Show a more detailed success message
      setTimeout(() => {
        toast.info(message, {
          duration: 5000,
        });
      }, 1000);

             // Form data is already updated during chunked processing

    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast.error("Failed to process Excel file. Please ensure it's in the correct format.");
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const currentMonth = MONTHS[new Date().getMonth()];
  const [reportTitle, setReportTitle] = useState(currentMonth);



  useEffect(() => {
    setReportTitle(currentMonth);
  }, [template]); // Reset when template changes

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
                   <span className="text-sm font-medium text-blue-800">
                     Processing Data {processingProgress.currentChunk}/{processingProgress.totalChunks}
                   </span>
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
                   ⚡ Processing in 50-row chunks, updating table every 1/4 of data with 10-second breaks
                 </p>
                 <p className="text-xs text-blue-400 mt-1">
                   💡 Please don't close this page during processing
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
            {formData.map((row, rowIndex) => {
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
                <TableRow key={rowIndex}>
                  <TableCell className="font-bold">{rowIndex + 1}</TableCell>
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
                    handleChange(rowIndex, colIndex, val);
                    if (isServiceColumn && expectedTimelineIndex !== -1) {
                      const dateSubmission = row[dateSubmissionIndex]?.trim();
                      if (dateSubmission) {
                        const timelineValue = getTimelineForService(val);
                        handleChange(rowIndex, expectedTimelineIndex, timelineValue);
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
                          <Textarea value={cell || ""} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} />
                        ) : header.type === "checkbox" ? (
                          <input
                            type="checkbox"
                            checked={cell === "true"}
                            onChange={e => handleChange(rowIndex, colIndex, e.target.checked ? "true" : "false")}
                            className="w-5 h-5 cursor-pointer"
                          />
                        ) : header.type === "date" ? (
                          <Input
                            type="date"
                            value={cell || ""}
                            onChange={e => handleChange(rowIndex, colIndex, e.target.value)}
                          />
                        ) : (
                          <Input
                            type={header.type === "number" ? "number" : "text"}
                            value={cell || ""}
                            onChange={e => handleChange(rowIndex, colIndex, e.target.value)}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(rowIndex)}
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
              accept=".xlsx, .xls"
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
            accept=".xlsx, .xls"
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
          <DialogTitle className="text-lg font-bold text-blue-600 mb-2">AI-Powered Excel Upload</DialogTitle>
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
    </div>
  );
}