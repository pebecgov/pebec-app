"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FillReportForm from "./FillReportForm"; // Import form component

interface ReportTemplate {
  _id: string;
  title: string;
  description?: string;
  role: "admin" | "user" | "mda" | "staff" | "sub_national"| "federal" | "deputies" | "magistrates" | "state_governor"| "president"| "vice_president";
  createdBy: string;
  headers: { name: string; type: "text" | "number" | "textarea" | "dropdown" | "checkbox"; options?: string[] }[];
}

export default function ReportTemplatesList() {
  const [selectedRole, setSelectedRole] = useState<"admin" | "mda" | "staff" | "sub_national" | "federal" | "deputies" | "magistrates" | "state_governor"| "president"| "vice_president"| "all">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  // ✅ Fetch Report Templates
  const reportTemplates = useQuery(
    api.internal_reports.getReportTemplates,
    selectedRole === "all" ? "skip" : { role: selectedRole }
  ) || [];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold">📋 Available Reports</h2>

      {/* Role Selection Filter */}
      <Select onValueChange={(val) => setSelectedRole(val as any)} value={selectedRole}>
        <SelectTrigger className="mb-4">
          <SelectValue placeholder="Filter by Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="mda">MDA</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
          <SelectItem value="sub_national">Sub-National</SelectItem>
        </SelectContent>
      </Select>

      {/* Report Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.length > 0 ? (
          reportTemplates.map((template) => (
            <div key={template._id} className="p-4 border rounded-lg shadow-md bg-gray-100">
              <h3 className="text-lg font-semibold">{template.title}</h3>
              <p className="text-sm text-gray-600">{template.description}</p>
              <Button className="mt-3" onClick={() => {
                setSelectedTemplate(template);
                setIsDialogOpen(true);
              }}>
                📝 Fill Report
              </Button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No reports available for this role.</p>
        )}
      </div>

      {/* Report Submission Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fill Out Report</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <FillReportForm template={selectedTemplate} onClose={() => setIsDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
