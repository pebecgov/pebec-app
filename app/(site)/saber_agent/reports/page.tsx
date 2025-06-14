"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, FileSpreadsheet, Save, Plus, Minus } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Type1DataForm from "@/components/Type1DataForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FaSpinner } from "react-icons/fa";
import { generateTemplatePDF } from "./genrateTemplatePDF";
import DLI4Form from "./DLI4Form";
import DLI6Form from "./DLI6Form";

const currentYear = new Date().getFullYear();
const yearsToShow = [currentYear - 3, currentYear - 2, currentYear - 1];

export interface Type1Data {
  question2: string[];
  question3: string;
  question4: string;
  question5: string[];
  question6: string;
  question7: string[];
  question8: string[];
  question9: string[];
  question10: string[];
  question11: string[];
}

 export interface Type2Data {
  announceInvestment: string[];
  dateOfAnnouncement: string[];
  media_platform: string[];
}

export interface Type3Data {
  noim: string[];
  lri: string[];
  sectors: string[];
  elibility: string[];
  description: string[];
  duration: string[];
  aaia: string[];
  noiri2022: string[];
  noiri2023: string[];
  noiri2024: string[];
}

export interface Type4Data {
  publishedDocumentLink: string;
  legislativeActions: {
    amendmentToRevenueCode: boolean;
    executiveOrder: boolean;
  };
  amendedLawLink: string;
  verification1: {
    confirmed: boolean;
    evidence: string;
  };
  verification2: {
    confirmed: boolean;
    evidence: string;
  };
  verification3: {
    confirmed: boolean;
    evidence: string;
  };
  verification4: {
    confirmed: boolean;
    evidence: string;
  };
  verification5: {
    confirmed: boolean;
    evidence: string;
  };
}

export interface Type5Data {
  // Section 2: Functions of SCEP
  scepMandateLink: string;
  
  // Section 3: Export Strategy
  hasExportStrategy: boolean;
  exportStrategyLink: string;
  
  // Section 4: Stakeholder Consultation
  stakeholderConsultation: {
    attendanceSheets: string;
    meetingMinutes: string;
    privateContributors: string[];
    feedbackSummary: string;
  };
  
  // Section 5: Operational Budget
  budgetDocuments: string;
  
  // Section 6: Implementation Activities
  implementationReports: string[];
  
  // Checklist items
  checklist: {
    exportStrategyDoc: boolean;
    publicationLink: boolean;
    attendanceSheets: boolean;
    privateContributors: boolean;
    budgetLineItems: boolean;
    nepcCertification: boolean;
    exportActivities: boolean;
    institutionalFramework: boolean;
  };
}

export interface Type6Data {
  // Section 2: GRM Structure
  responsibleAgency: string;
  
  // Section 3: Complaint Channels
  complaintChannels: {
    telephone: string;
    email: string;
    walkInAddress: string;
    onlinePortal: string;
  };
  
  // Section 4: Registration System
  registrationSystem: {
    systemLink: string;
    systemScreenshot: string;
  };
  
  // Section 5: SLA Details
  slaDetails: {
    acknowledgementTime: string;
    resolutionTime: string;
    slaDocument: string;
  };
  
  // Section 6: Performance Tracking
  performanceData: {
    totalComplaints: string;
    resolvedWithinSLA: string;
    percentageResolved: string;
    slaComplianceMet: boolean;
    quarterlyReport: string;
  };
  
  // Section 7: Escalation Framework
  escalationFramework: {
    escalationChart: string;
    sopDocument: string;
  };
  
  // Section 8: Stakeholder Communication
  communicationEvidence: {
    campaignEvidence: string;
    onlineMaterials: string;
  };
  
  // Checklist items
  checklist: {
    complaintLogbook: boolean;
    slaDocument: boolean;
    quarterlyReport: boolean;
    escalationSOP: boolean;
    communicationMaterials: boolean;
  };
}

interface DLICategory {
  id: string;
  name: string;
  reportTypes: {
    value: string;
    label: string;
  }[];
}

const dliCategories: DLICategory[] = [
  {
    id: "dli4",
    name: "DLI-4",
    reportTypes: [
      { value: "type1", label: "State Investor Aftercare and Retention Program" },
      { value: "type2", label: "Announce Investment" },
      { value: "type3", label: "Inventory Incentive" }
    ]
  },
  {
    id: "dli5",
    name: "DLI-5",
    reportTypes: [
      // Type 4 moved to DLI-6
    ]
  },
  {
    id: "dli6",
    name: "DLI-6",
          reportTypes: [
        { value: "type4", label: "State Schedule of Trade-Related Fees Compliance Report" },
        { value: "type5", label: "State Committee on Export Promotion (SCEP) Report" },
        { value: "type6", label: "Grievance Redress Mechanism (GRM) Report" }
      ]
  },
  {
    id: "dli8",
    name: "DLI-8",
    reportTypes: [
      { value: "type8", label: "Gender Inclusion Report" },
      { value: "type9", label: "Environmental Compliance Report" }
    ]
  }
];

type ReportTypeDataMap = {
  type1Data: Type1Data;
  type2Data: Type2Data;
  type3Data: Type3Data;
  type4Data: Type4Data;
  type5Data: Type5Data;
  type6Data: Type6Data;
};

export interface FormData {
  reportType: "type1" | "type2" | "type3" | "type4" | "type5" | "type6";
  type1Data?: Type1Data;
  type2Data?: Type2Data;
  type3Data?: Type3Data;
  type4Data?: Type4Data;
  type5Data?: Type5Data;
  type6Data?: Type6Data;
}

const getInitialFormData = (reportType: FormData["reportType"]): FormData => {
  const base: FormData = { reportType };
  if (reportType === "type1") {
    base.type1Data = {
      question2: [""],
      question3: "",
      question4: "",
      question5: [""],
      question6: "",
      question7: [""],
      question8: [""],
      question9: [""],
      question10: [""],
      question11: [""],
    };
  } else if (reportType === "type2") {
    base.type2Data = {
      announceInvestment: [""],
      dateOfAnnouncement: [""],
      media_platform: [""],
    };
  } else if (reportType === "type3") {
    base.type3Data = {
      noim: [""],
      lri: [""],
      sectors: [""],
      elibility: [""],
      description: [""],
      duration: [""],
      aaia: [""],
      noiri2022: [""],
      noiri2023: [""],
      noiri2024: [""],
    };
  } else if (reportType === "type4") {
    base.type4Data = {
      publishedDocumentLink: "",
      legislativeActions: {
        amendmentToRevenueCode: false,
        executiveOrder: false,
      },
      amendedLawLink: "",
      verification1: { confirmed: false, evidence: "" },
      verification2: { confirmed: false, evidence: "" },
      verification3: { confirmed: false, evidence: "" },
      verification4: { confirmed: false, evidence: "" },
      verification5: { confirmed: false, evidence: "" },
    };
  } else if (reportType === "type5") {
    base.type5Data = {
      scepMandateLink: "",
      hasExportStrategy: false,
      exportStrategyLink: "",
      stakeholderConsultation: {
        attendanceSheets: "",
        meetingMinutes: "",
        privateContributors: [],
        feedbackSummary: "",
      },
      budgetDocuments: "",
      implementationReports: [],
      checklist: {
        exportStrategyDoc: false,
        publicationLink: false,
        attendanceSheets: false,
        privateContributors: false,
        budgetLineItems: false,
        nepcCertification: false,
        exportActivities: false,
        institutionalFramework: false,
      },
    };
  } else if (reportType === "type6") {
    base.type6Data = {
      responsibleAgency: "",
      complaintChannels: {
        telephone: "",
        email: "",
        walkInAddress: "",
        onlinePortal: "",
      },
      registrationSystem: {
        systemLink: "",
        systemScreenshot: "",
      },
      slaDetails: {
        acknowledgementTime: "",
        resolutionTime: "",
        slaDocument: "",
      },
      performanceData: {
        totalComplaints: "",
        resolvedWithinSLA: "",
        percentageResolved: "",
        slaComplianceMet: false,
        quarterlyReport: "",
      },
      escalationFramework: {
        escalationChart: "",
        sopDocument: "",
      },
      communicationEvidence: {
        campaignEvidence: "",
        onlineMaterials: "",
      },
      checklist: {
        complaintLogbook: false,
        slaDocument: false,
        quarterlyReport: false,
        escalationSOP: false,
        communicationMaterials: false,
      },
    };
  }
  return base;
};

// Function to get report title from template type
const getReportTitle = (reportType: FormData["reportType"], userState?: string): string => {
  const statePrefix = userState ? `${userState} ` : "";

  switch (reportType) {
    case "type1":
      return `${statePrefix}State's Investor Aftercare and Retention Program`;
    case "type2":
      return `${statePrefix}Announce Investment Report`;
    case "type3":
      return `${statePrefix}Inventory Incentive Report`;
    case "type4":
      return `${statePrefix}State Schedule of Trade-Related Fees Compliance Report`;
    case "type5":
      return `${statePrefix}State Committee on Export Promotion (SCEP) Report`;
    case "type6":
      return `${statePrefix}Grievance Redress Mechanism (GRM) Report`;
    default:
      return `${statePrefix}Saber Agent Report`;
  }
};

export default function SaberAgentReportPage() {
const { user } = useUser();
  const [selectedDLI, setSelectedDLI] = useState<string>("dli4");
  const [loading,setLoading] = useState(false)
  // Template form state
  const [templateFormData, setTemplateFormData] = useState<FormData>(() => {
    const initialDLI = dliCategories.find(dli => dli.id === "dli4")!;
    const firstReportType = initialDLI.reportTypes[0].value as FormData["reportType"];
    return getInitialFormData(firstReportType);
  });

  // Get user's submitted reports
  const myReports = useQuery(api.saber_reports.getMyReports) ?? [];

  // Get current user data to access state
  const currentUser = useQuery(api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  useEffect(() => {
    const currentDLI = dliCategories.find(dli => dli.id === selectedDLI);
    if (currentDLI && currentDLI.reportTypes.length > 0) {
      const firstReportType = currentDLI.reportTypes[0].value as FormData["reportType"];
      setTemplateFormData(getInitialFormData(firstReportType));
    }
  }, [selectedDLI]);
  // Mutations
  const submitReport = useMutation(api.saber_reports.submitReport);
  const generateUploadUrl = useMutation(api.saber_reports.generateUploadUrl);

  const handleTemplateDataStringChange = <T extends keyof ReportTypeDataMap>(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    type: T
  ) => {
    const { name, value } = e.target;
    setTemplateFormData((prev) => {
      const currentTypeData = (prev[type] || {}) as ReportTypeDataMap[T];
      return {
        ...prev,
        [type]: {
          ...currentTypeData,
          [name]: value,
        },
      };
    });
  };

  const handleTemplateDataArrayElementChange = <
    T extends keyof ReportTypeDataMap,
    K extends keyof ReportTypeDataMap[T],
  >(
    type: T,
    fieldName: K,
    index: number,
    value: string
  ) => {
    setTemplateFormData((prev) => {
      const currentTypeData = (prev[type] || {}) as ReportTypeDataMap[T];
      const currentArray = ((currentTypeData[fieldName] as string[]) || []).slice();
      currentArray[index] = value;

      return {
        ...prev,
        [type]: {
          ...currentTypeData,
          [fieldName]: currentArray,
        },
      };
    });
  };

  const renderDateArrayInputs = <
    T extends keyof ReportTypeDataMap,
    K extends keyof ReportTypeDataMap[T],
  >(
    type: T,
    fieldName: K,
    label: string,
    required: boolean = false
  ) => {
    const typeData = templateFormData[type];
    const currentArray = (typeData && (typeData as any)[fieldName] as string[]) || [""];

    return (
      <div className="space-y-2 mb-4">
        <Label className="text-sm font-medium">{label}</Label>
        {currentArray.map((value, index) => (
          <div key={`${String(fieldName)}-${index}`} className="flex items-center gap-2">
            <Input
              type="date"
              value={value}
              onChange={(e) =>
                handleTemplateDataArrayElementChange(
                  type,
                  fieldName,
                  index,
                  e.target.value
                )
              }
              required={required && index === 0}
              className="flex-1"
            />
            {currentArray.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveArrayElement(type, fieldName, index)}
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddArrayElement(type, fieldName)}
          className="mt-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Date
        </Button>
      </div>
    );
  };
  const handleAddArrayElement = <
    T extends keyof ReportTypeDataMap,
    K extends keyof ReportTypeDataMap[T],
  >(
    type: T,
    fieldName: K
  ) => {
    setTemplateFormData((prev) => {
      const currentTypeData = (prev[type] || {}) as ReportTypeDataMap[T];
      const currentArray = (currentTypeData[fieldName] as string[]) || [];
      const updatedArray = [...currentArray, ""];

      return {
        ...prev,
        [type]: {
          ...currentTypeData,
          [fieldName]: updatedArray,
        },
      };
    });
  };

  const handleRemoveArrayElement = <
    T extends keyof ReportTypeDataMap,
    K extends keyof ReportTypeDataMap[T],
  >(
    type: T,
    fieldName: K,
    indexToRemove: number
  ) => {
    setTemplateFormData((prev) => {
      const currentTypeData = (prev[type] || {}) as ReportTypeDataMap[T];
      const currentArray = (currentTypeData[fieldName] as string[]).slice();
      const updatedArray = currentArray.filter((_, idx) => idx !== indexToRemove);

      if (updatedArray.length === 0) {
        updatedArray.push("");
      }

      return {
        ...prev,
        [type]: {
          ...currentTypeData,
          [fieldName]: updatedArray,
        },
      };
    });
  };

  const renderArrayInputs = <T extends keyof ReportTypeDataMap, K extends keyof ReportTypeDataMap[T]>(
    type: T,
    fieldName: K,
    label: string,
    placeholder: string,
    required: boolean = false
  ) => {
    const typeData = templateFormData[type];
    const currentArray = (typeData && (typeData as any)[fieldName] as string[]) || [""];

    return (
      <div className="space-y-2 mb-4">
        <Label className="text-sm font-medium">{label}</Label>
        {currentArray.map((value, index) => (
          <div key={`${String(fieldName)}-${index}`} className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) =>
                handleTemplateDataArrayElementChange(
                  type,
                  fieldName,
                  index,
                  e.target.value
                )
              }
              placeholder={`${placeholder} ${index + 1}`}
              required={required && index === 0}
              className="flex-1"
            />
            {currentArray.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveArrayElement(type, fieldName, index)}
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddArrayElement(type, fieldName)}
          className="mt-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Answer
        </Button>
      </div>
    );
  };


const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Generate PDF from template
      setLoading(true)
      
 const doc = generateTemplatePDF(templateFormData, currentUser?.state);
      const pdfBlob = doc.output('blob');

      // Upload PDF to storage
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": pdfBlob.type,
        },
        body: pdfBlob,
      });
      const { storageId } = await result.json();

      // Submit report with simple form data + PDF
      
      await submitReport({
        title: getReportTitle(templateFormData.reportType, currentUser?.state),
        fileId: storageId,
        fileSize: pdfBlob.size,
      });

      toast.success("Report submitted successfully");
      setLoading(false)
      // Clear forms
      setTemplateFormData(getInitialFormData("type1"));
    } catch (error) {
      toast.error("Failed to submit report");
      console.error("Error submitting report:", error);
    }
  };

  const handleReportTypeChange = (value: string) => {
    const newType = value as FormData["reportType"];
    setTemplateFormData(getInitialFormData(newType));
  };

  const downloadAsPDF = (report) => {
    const doc = new jsPDF();
    doc.text("Saber Agent Report", 20, 10);
    doc.text(`Agent Name: ${report.userName}`, 20, 30);
    doc.text(`State: ${report.state}`, 20, 40);
    doc.text(`Title: ${report.title}`, 20, 50);
    doc.text(`Status: ${report.status}`, 20, 60);
    doc.save(`saber-report-${report.title}.pdf`);
  };

  const downloadAsExcel = (report) => {
    const ws = XLSX.utils.json_to_sheet([{
      "Title": report.title,
      "State": report.state,
      "Status": report.status,
        "Submitted On": new Date(report.submittedAt).toLocaleDateString(),
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `saber-report-${report.title}.xlsx`);
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">SABER AGENT REPORT SUBMIT FORM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Form */}
            <div className="flex flex-wrap gap-2 mb-4">
              {dliCategories.map((dli) => (
                <Button
                  key={dli.id}
                  type="button"
                  variant={selectedDLI === dli.id ? "default" : "outline"}
                  onClick={() => setSelectedDLI(dli.id)}
                >
                  {dli.name}
                </Button>
              ))}
            </div>
            <div className="p-4 border border-dashed border-gray-300 rounded-lg">
              {/* <h3 className="text-lg font-semibold mb-4">Select Report Template</h3> */}

              {/* <div className="space-y-2 mb-6">
                <Label>Report Type</Label>
                <Select
                  value={templateFormData.reportType}
                  onValueChange={handleReportTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type1">
                      State Investor Aftercare and Retention Program
                    </SelectItem>
                    <SelectItem value="type2">Announce Investment</SelectItem>
                    <SelectItem value="type3">Inventory Incentive</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
              <h3 className="text-lg font-semibold mb-4">Select Report Template</h3>

              <div className="space-y-2 mb-6">
                <Label>Report Type</Label>
                <Select
                  value={templateFormData.reportType}
                  onValueChange={handleReportTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {dliCategories
                      .find(dli => dli.id === selectedDLI)
                      ?.reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type 1 Form Fields */}
              {selectedDLI === "dli4" && (
                <DLI4Form
                  templateFormData={templateFormData}
                  setTemplateFormData={setTemplateFormData}
                  renderArrayInputs={renderArrayInputs}
                  renderDateArrayInputs={renderDateArrayInputs}
                  handleTemplateDataStringChange={handleTemplateDataStringChange}
                  handleTemplateDataArrayElementChange={handleTemplateDataArrayElementChange}
                  handleAddArrayElement={handleAddArrayElement}
                  handleRemoveArrayElement={handleRemoveArrayElement}
                />
              )}       


            {/* Dli6 form */}
            {selectedDLI === "dli6" && (
              <DLI6Form
                templateFormData={templateFormData}
                setTemplateFormData={setTemplateFormData}
                renderArrayInputs={renderArrayInputs}
                renderDateArrayInputs={renderDateArrayInputs}
                handleTemplateDataStringChange={handleTemplateDataStringChange}
                handleTemplateDataArrayElementChange={handleTemplateDataArrayElementChange}
                handleAddArrayElement={handleAddArrayElement}
                handleRemoveArrayElement={handleRemoveArrayElement}
              />
            )}
            </div>
              {loading ?<div className="flex justify-center text-2xl items-center w-full"><FaSpinner className="animation-spin"/></div>  :<Button type="submit" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Submit Report
            </Button>}
           
            
          </form>
        </CardContent>
      </Card>

      {/* My Submitted Reports */}
      <Card>
        <CardHeader>
          <CardTitle>My Submitted Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myReports.length > 0 ? (
                  myReports.map((report) => (
                    <TableRow key={report._id}>
                      <TableCell>{report.title}</TableCell>
                      <TableCell>{report.state}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${report.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : report.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {report.status.charAt(0).toUpperCase() +
                            report.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(report.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {report.fileUrl ? (
                            <a
                              href={report.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              Download
                            </a>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAsPDF(report)}
                              >
                                <FileDown className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAsExcel(report)}
                              >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Excel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-4 text-gray-500"
                    >
                      No reports submitted yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
