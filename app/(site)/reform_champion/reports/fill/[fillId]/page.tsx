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
import { Save, FileText, Trash2 } from "lucide-react";
export default function FillReportPage() {
  const {
    fillId
  } = useParams();
  const router = useRouter();
  const {
    user
  } = useUser();
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
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const draftLoadedRef = useRef(false);
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");
  const convexUserId = convexUser?._id;
  const availableReports = useQuery(api.internal_reports.getAvailableReports, convexUser?.role && validRoles.includes(convexUser.role as Role) ? {
    role: convexUser.role as Role
  } : "skip") ?? [];
  
  // Draft-related mutations and queries
  const saveDraft = useMutation(api.internal_reports.saveDraftReport);
  const submitDraftReport = useMutation(api.internal_reports.submitDraftReport);
  const deleteDraft = useMutation(api.internal_reports.deleteDraftReport);
  const drafts = useQuery(api.internal_reports.getDraftReports, convexUserId && fillId ? {
    submittedBy: convexUserId,
    templateId: fillId as Id<"report_templates">
  } : "skip") ?? [];
  
  useEffect(() => {
    if (fillId && availableReports.length > 0) {
      const foundTemplate = availableReports.find(t => t._id === fillId);
      if (foundTemplate) {
        setTemplate(foundTemplate as typeof template);
        setFormData([foundTemplate.headers.map(() => "")]);
        // Reset draft loading state when template changes
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
      if (existingDraft && existingDraft.data && Array.isArray(existingDraft.data)) {
        setFormData(existingDraft.data);
        setCurrentDraft(existingDraft._id);
        setLastSavedAt(new Date(existingDraft.updatedAt || existingDraft.submittedAt));
        draftLoadedRef.current = true;
      } else {
        // No draft found, mark as loaded to prevent further checking
        draftLoadedRef.current = true;
      }
    }
  }, [template, drafts, convexUserId]);


  
  const submitReport = useMutation(api.internal_reports.submitInternalReport);
  const handleChange = (rowIndex: number, colIndex: number, value: string) => {
    setFormData(prev => {
      const updated = [...prev];
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
  const handleSaveDraft = async () => {
    if (!convexUserId || !template) {
      toast.error("User not found in the database.");
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
    } catch {
      toast.error("Failed to save draft.");
    }
  };

  const handleSubmit = async () => {
    if (!convexUserId || !template) {
      toast.error("User not found in the database.");
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
    } catch {
      toast.error("Failed to submit report.");
    }
  };

  const handleDeleteDraft = async () => {
    if (!currentDraft) return;
    
    try {
      await deleteDraft({ draftId: currentDraft });
      setCurrentDraft(null);
      setLastSavedAt(null);
      // Reset form to empty
      if (template) {
        setFormData([template.headers.map(() => "")]);
      }
      toast.success("Draft deleted successfully!");
      setShowDraftDialog(false);
    } catch {
      toast.error("Failed to delete draft.");
    }
  };
  if (!template) return <p className="text-center p-6 text-gray-500">Loading Report...</p>;
  
  // Ensure formData is properly initialized before rendering
  if (!formData || formData.length === 0) {
    return <p className="text-center p-6 text-gray-500">Preparing form...</p>;
  }
  return <div className="p-6 bg-white rounded-lg shadow-md overflow-x-auto">
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

      {}
      <div className="overflow-x-auto">
        <Table className="mb-4 min-w-max">
          <TableHeader>
            <TableRow>
              {template.headers.map((header, index) => <TableHead key={index}>{header.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.map((row, rowIndex) => <TableRow key={rowIndex}>
                {row.map((cell, colIndex) => <TableCell key={colIndex}>
                 {template.headers[colIndex].type === "dropdown" ? <Select value={cell || ""} onValueChange={val => handleChange(rowIndex, colIndex, val)}>
    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
    <SelectContent>
      {template.headers[colIndex].options?.map((option, i) => <SelectItem key={i} value={option}>{option}</SelectItem>)}
    </SelectContent>
  </Select> : template.headers[colIndex].type === "textarea" ? <Textarea value={cell || ""} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} /> : template.headers[colIndex].type === "checkbox" ? <input type="checkbox" checked={cell === "true"} onChange={e => handleChange(rowIndex, colIndex, e.target.checked ? "true" : "false")} className="w-5 h-5 cursor-pointer" /> : template.headers[colIndex].type === "date" ? <Input type="date" value={cell || ""} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} /> : <Input type={template.headers[colIndex].type === "number" ? "number" : "text"} value={cell || ""} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} />}

               </TableCell>)}
              </TableRow>)}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={() => addRow(false)} variant="outline" className="mr-2">
          ➕ Add Empty Row
        </Button>
        <Button 
          onClick={() => addRow(true)} 
          variant="outline" 
          className="mr-2"
          disabled={formData.length === 0}
        >
          📋 Add Row with Previous Data
        </Button>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handleSaveDraft} 
          variant="outline"
          className="flex items-center gap-1"
        >
          <Save className="w-4 h-4" />
          Save as Draft
        </Button>
        <Button onClick={handleSubmit} className="bg-green-600 text-white">
          ✅ Submit Report
        </Button>
      </div>
    </div>;
}