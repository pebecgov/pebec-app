// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
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

  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const convexUserId = convexUser?._id;

  const availableReports = useQuery(api.internal_reports.getAvailableReports, convexUser?.role && validRoles.includes(convexUser.role as Role) ? { role: convexUser.role as Role } : "skip") ?? [];

  // Draft-related mutations and queries
  const saveDraft = useMutation(api.internal_reports.saveDraftReport);
  const submitDraftReport = useMutation(api.internal_reports.submitDraftReport);
  const deleteDraft = useMutation(api.internal_reports.deleteDraftReport);
  const drafts = useQuery(api.internal_reports.getDraftReports, convexUserId && fillId ? { submittedBy: convexUserId, templateId: fillId as Id<"report_templates"> } : "skip") ?? [];

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
        // Update the draft data first, then submit it
        await saveDraft({
          templateId: template._id,
          submittedBy: convexUserId as Id<"users">,
          role: template.role,
          data: formData,
          draftId: currentDraft
        });

        // Submit the draft as final report
        await submitDraftReport({
          draftId: currentDraft
        });
      } else {
        // Submit directly
        await submitReport({
          templateId: template._id,
          submittedBy: convexUserId as Id<"users">,
          role: template.role,
          data: formData
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
      // Reset form to an empty row
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

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !template) {
      toast.error("No file selected or template not loaded.");
      return;
    }

    try {
      const excelData = await parseExcelFile(file);
      if (excelData.length === 0) {
        toast.info("The uploaded Excel file is empty.");
        return;
      }

      const newRowsFromExcel: string[][] = [];

      excelData.forEach(excelRow => {
        const newFormRow: string[] = template.headers.map(() => ""); // Initialize an empty row matching template structure
        
        template.headers.forEach((header, colIndex) => {
          // Find the value in the Excel row corresponding to the current template header name
          // Excel header names should ideally match template header names for direct mapping
          const excelValue = excelRow[header.name]; 
          
          let processedValue = String(excelValue || ''); // Default to empty string if null/undefined

          // Type conversion and handling
          if (excelValue !== undefined && excelValue !== null) {
            switch (header.type) {
              case "number":
                processedValue = String(parseFloat(excelValue) || 0); // Convert to number, then string
                break;
              case "checkbox":
                // Assuming Excel 'Yes'/'No', 1/0, 'true'/'false'
                processedValue = (String(excelValue).toLowerCase() === 'true' || String(excelValue) === '1' || String(excelValue).toLowerCase() === 'yes') ? "true" : "false";
                break;
              case "date":
               if (typeof excelValue === 'number') {
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
        });
        newRowsFromExcel.push(newFormRow);
      });

      // If form is currently empty (only one default empty row), replace it.
      // Otherwise, append the new rows.
      if (formData.length === 1 && formData[0].every(cell => cell === "")) {
        setFormData(newRowsFromExcel);
      } else {
        setFormData(prev => [...prev, ...newRowsFromExcel]);
      }
      toast.success(`${newRowsFromExcel.length} rows imported successfully from Excel!`);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast.error("Failed to process Excel file. Please ensure it's in the correct format.");
    } finally {
        // Reset file input to allow re-uploading the same file
        event.target.value = '';
    }
  };


  if (!template) return <p className="text-center p-6 text-gray-500">Loading Report...</p>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md overflow-x-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">{template.title}</h2>
          <p className="text-gray-600">{template.description}</p>
          {currentDraft && lastSavedAt && (
            <p className="text-sm text-green-600 mt-1">
              💾 Draft saved at {lastSavedAt.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
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
              {template.headers.map((header, index) => (
                <TableHead key={index}>{header.name}</TableHead>
              ))}
              <TableHead className="w-[50px]">Actions</TableHead> {/* New column for remove button */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <TableCell key={colIndex}>
                    {template.headers[colIndex].type === "dropdown" ? (
                      <Select value={cell || ""} onValueChange={val => handleChange(rowIndex, colIndex, val)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {template.headers[colIndex].options?.map((option, i) => (
                            <SelectItem key={i} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : template.headers[colIndex].type === "textarea" ? (
                      <Textarea value={cell || ""} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} />
                    ) : template.headers[colIndex].type === "checkbox" ? (
                      <input type="checkbox" checked={cell === "true"} onChange={e => handleChange(rowIndex, colIndex, e.target.checked ? "true" : "false")} className="w-5 h-5 cursor-pointer" />
                    ) : template.headers[colIndex].type === "date" ? (
                      <Input type="date" value={cell || ""} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} />
                    ) : (
                      <Input type={template.headers[colIndex].type === "number" ? "number" : "text"} value={cell || ""} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} />
                    )}
                  </TableCell>
                ))}
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
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Button onClick={() => addRow(false)} variant="outline">
          ➕ Add Empty Row
        </Button>
        {/* <Button
          onClick={() => addRow(true)}
          variant="outline"
          disabled={formData.length === 0}
        >
          📋 Add Row with Previous Data
        </Button> */}
        <div className="border rounded-md bg-gray-50 flex items-center gap-2">
          <label htmlFor="excel-file-upload" className="flex items-center justify-center px-2 py-1 border border-gray-300 bg-white text-gray-800 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
            <Upload className="w-4 h-4 mr-1" /> Select Excel
            <input
              id="excel-file-upload"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>
        </div>
        <Button
          onClick={handleSaveDraft}
          variant="outline"
          className="flex items-center gap-1"
        >
          <Save className="w-4 h-4" />
          Save as Draft
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="bg-green-600 text-white">
          ✅ Submit Report
        </Button>
      </div>
    </div>
  );
}