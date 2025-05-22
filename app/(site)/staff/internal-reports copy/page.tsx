// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import CreateReportTemplate from "@/components/ReportTemplate";
import ReportTemplatesList from "@/components/ReportTemplate/ReportTemplateList";
export default function ReportsPage() {
  return <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Reports Management</h1>
      <ReportTemplatesList />
    </div>;
}