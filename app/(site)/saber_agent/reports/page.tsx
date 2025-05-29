"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const yearsToShow = [currentYear - 3, currentYear - 2, currentYear - 1];

interface Type1Data {
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

interface Type2Data {
  announceInvestment: string[];
  dateOfAnnouncement: string;
  media_platform: string[];
}

interface Type3Data {
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

type ReportTypeDataMap = {
  type1Data: Type1Data;
  type2Data: Type2Data;
  type3Data: Type3Data;
};

interface FormData {
  reportType: "type1" | "type2" | "type3";
  type1Data?: Type1Data;
  type2Data?: Type2Data;
  type3Data?: Type3Data;
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
      dateOfAnnouncement: "",
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
    default:
      return `${statePrefix}Saber Agent Report`;
  }
};

export default function SaberAgentReportPage() {
  const { user } = useUser();

  // Template form state
  const [templateFormData, setTemplateFormData] = useState<FormData>(
    getInitialFormData("type1")
  );

  // Get user's submitted reports
  const myReports = useQuery(api.saber_reports.getMyReports) ?? [];
  
  // Get current user data to access state
  const currentUser = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  
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
      const currentArray = (currentTypeData[fieldName] as string[]).slice();
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

  const generateTemplatePDF = (formData: FormData) => {
    const doc = new jsPDF({
      orientation: formData.reportType === "type3" ? "landscape" : "portrait",
      unit: "mm",
    });

    // Deep copy and filter out empty strings from arrays for PDF generation
    const cleanedFormData = JSON.parse(JSON.stringify(formData));
    if (cleanedFormData.type1Data) {
      Object.keys(cleanedFormData.type1Data).forEach((key) => {
        if (Array.isArray(cleanedFormData.type1Data[key])) {
          cleanedFormData.type1Data[key] = cleanedFormData.type1Data[
            key
          ].filter((item: string) => item.trim() !== "");
        }
      });
    }
    if (cleanedFormData.type2Data) {
      Object.keys(cleanedFormData.type2Data).forEach((key) => {
        if (Array.isArray(cleanedFormData.type2Data[key])) {
          cleanedFormData.type2Data[key] = cleanedFormData.type2Data[
            key
          ].filter((item: string) => item.trim() !== "");
        }
      });
    }
    if (cleanedFormData.type3Data) {
      Object.keys(cleanedFormData.type3Data).forEach((key) => {
        if (Array.isArray(cleanedFormData.type3Data[key])) {
          cleanedFormData.type3Data[key] = cleanedFormData.type3Data[
            key
          ].filter((item: string) => item.trim() !== "");
        }
      });
    }

    if (formData.reportType === "type1" && cleanedFormData.type1Data) {
      const type1Data = cleanedFormData.type1Data;

      // Generate the detailed Type 1 PDF content (same as original)
      const introductionText = `The purpose of this Investor Aftercare and Retention Strategy document is to articulate a proactive approach to supporting and sustaining investments within our state. Recognizing that the retention and expansion of existing investors is as critical as attracting new ones, this strategy outlines the sectors we prioritize, the criteria for aftercare eligibility, and the mechanisms we will use to deliver consistent and responsive support services to investors.`;
      const criterionText = `Our Aftercare and Retention Program will initially target strategic sectors that align with our state's development priorities and offer high economic impact. These include :`;
      const investmentSizeText = `Aftercare and Retention services will be extended to investors in the State particularly those with a capital base above ${type1Data.question3 || "N/A"} or employing ${type1Data.question4 || "N/A"} or more people. However, we recognize that certain high-impact small enterprises, especially those in innovation-driven sectors, may also warrant strategic aftercare.`;
      const investmentCriteriaText = `In addition, investments will be assessed based on the following criteria:`;
      const stakeholderEngagementText = `We plan to conduct ${type1Data.question6 || "N/A"} formal stakeholder engagement forums. These engagements are designed to provide feedback channels, foster collaboration between investors and regulators, and proactively identify emerging challenges.`;
      const methodsOfDeliveryIntro = `Our approach will be a mix of services which will include:`;
      const facilitationIntro = `We assist investors with licensing, renewals, and compliance support by acting as a liaison with the relevant Ministries, Departments, and Agencies (MDAs). Our investor services desk provides:`;
      const digitalPlatformsText = `We will also leverage digital platforms for investor engagement, feedback collection, and service tracking, allowing us to respond faster and monitor satisfaction.`;
      const grievanceIntro = `${type1Data.question9[0] || ""} Our state ${type1Data.question9[1] || ""} a formal Grievance Redress Mechanism (GRM). The GRM ensures that investor concerns are handled in a structured, time-bound, and accountable manner.`;
      const complaintsChannelsIntro = `Investor complaints can be submitted through multiple channels:`;
      const escalationIntro = `We maintain an escalation framwork to resolve investor complaints that cannot be addressed by the Investment Promotion Agency. The structure involves:`;
      const escalationConclusion = `This escalation structure ensures that no investor concern goes unaddressed and that systemic issues are flagged for policy reform or executive action.`;
      const conclusionText = `Our commitment to investor aftercare and retention is rooted in the belief that existing investors are our best ambassadors. This strategy positions the state as a partner in business success, a state that listens, responds, and evolves to ensure that investments not only survive but thrive.`;

      const sectorsList = type1Data.question2.map((item: string) => ` - ${item}`).join("\n") || "N/A";
      const eligibilityCriteria = type1Data.question5.map((item: string) => ` - ${item}`).join("\n") || "N/A";
      const methodsOfDeliveryList = type1Data.question7.map((item: string) => ` - ${item}`).join("\n") || "N/A";
      const investorServicesList = type1Data.question8.map((item: string) => ` - ${item}`).join("\n") || "N/A";
      const complaintsChannelsList = type1Data.question10.map((item: string) => ` - ${item}`).join("\n") || "N/A";
      const escalationSteps = type1Data.question11.map((item: string) => ` - ${item}`).join("\n") || "N/A";

      let y = 20;
      const marginX = 14;

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("State's Investor Aftercare and Retention Program", marginX, y);
      y += 10;

      // Introduction
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Introduction", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const introLines = doc.splitTextToSize(introductionText, 180);
      introLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 5;

      // Sectors section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Strategic Sectors", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const criterionLines = doc.splitTextToSize(criterionText, 180);
      criterionLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 3;

      const sectorLines = doc.splitTextToSize(sectorsList, 180);
      sectorLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Investment Size and Employment section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Investment Size and Employment Criteria", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const investmentSizeLines = doc.splitTextToSize(investmentSizeText, 180);
      investmentSizeLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Additional Investment Criteria section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Additional Investment Criteria", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const investmentCriteriaLines = doc.splitTextToSize(investmentCriteriaText, 180);
      investmentCriteriaLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 3;

      const eligibilityLines = doc.splitTextToSize(eligibilityCriteria, 180);
      eligibilityLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Stakeholder Engagement section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Stakeholder Engagement", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const stakeholderLines = doc.splitTextToSize(stakeholderEngagementText, 180);
      stakeholderLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Methods of Delivery section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Service Delivery Methods", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const methodsIntroLines = doc.splitTextToSize(methodsOfDeliveryIntro, 180);
      methodsIntroLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 3;

      const methodsLines = doc.splitTextToSize(methodsOfDeliveryList, 180);
      methodsLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Facilitation Services section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Investor Services and Facilitation", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const facilitationLines = doc.splitTextToSize(facilitationIntro, 180);
      facilitationLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 3;

      const servicesLines = doc.splitTextToSize(investorServicesList, 180);
      servicesLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 5;

      const digitalLines = doc.splitTextToSize(digitalPlatformsText, 180);
      digitalLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Grievance Redress Mechanism section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Grievance Redress Mechanism", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const grievanceLines = doc.splitTextToSize(grievanceIntro, 180);
      grievanceLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Complaints Channels section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Complaint Submission Channels", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const complaintsIntroLines = doc.splitTextToSize(complaintsChannelsIntro, 180);
      complaintsIntroLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 3;

      const complaintsLines = doc.splitTextToSize(complaintsChannelsList, 180);
      complaintsLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Escalation Framework section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Escalation Framework", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const escalationIntroLines = doc.splitTextToSize(escalationIntro, 180);
      escalationIntroLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 3;

      const escalationLines = doc.splitTextToSize(escalationSteps, 180);
      escalationLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 5;

      const escalationConclusionLines = doc.splitTextToSize(escalationConclusion, 180);
      escalationConclusionLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 8;

      // Conclusion section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Conclusion", marginX, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const conclusionLines = doc.splitTextToSize(conclusionText, 180);
      conclusionLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });

      // Continue with all the other sections...
      // (Implementation continues with all sections from the original template)
      
    } else {
      // Type 2 and Type 3 table generation (same as original)
      const headers: string[] = [];
      const allRows: any[][] = [];
      let maxRows = 1;
      let typeSpecificData: Type1Data | Type2Data | Type3Data | undefined;
      let reportTitlePrefix = "Saber Agent Report";

      switch (cleanedFormData.reportType) {
        case "type2":
          reportTitlePrefix = "ANNOUNCE INVESTMENT REPORT";
          typeSpecificData = cleanedFormData.type2Data;
          if (typeSpecificData) {
            headers.push("S.No.", "Announce Investment", "Date of Announcement", "Media Platform");
            maxRows = Math.max(maxRows, (typeSpecificData as Type2Data).announceInvestment.length);
          }
          break;
        case "type3":
          typeSpecificData = cleanedFormData.type3Data;
          reportTitlePrefix = "INCENTIVE INVESTMENT REPORT";
          if (typeSpecificData) {
            headers.push(
              "S.No.",
              "NAME OF INCENTIVE MEASURE",
              "LEGAL REFERENCE INSTRUMENT",
              "SECTORS",
              "ELIGIBILITY CRITERIA",
              "DESCRIPTION OF BENEFITS",
              "DURATION",
              "AWARDING IMPLEMENTING AGENCY",
              `NUMBER OF INCENTIVES RECIPIENTS IN ${yearsToShow[0]}`,
              "NUMBER OF INCENTIVES RECIPIENTS IN 2023",
              "NUMBER OF INCENTIVES RECIPIENTS IN 2024"
            );
            const type3Data = typeSpecificData as Type3Data;
            maxRows = Math.max(
              maxRows,
              type3Data.noim.length,
              type3Data.lri.length,
              type3Data.sectors.length,
              type3Data.elibility.length,
              type3Data.description.length,
              type3Data.duration.length,
              type3Data.aaia.length,
              type3Data.noiri2022.length,
              type3Data.noiri2023.length,
              type3Data.noiri2024.length
            );
          }
          break;
      }

      for (let i = 0; i < maxRows; i++) {
        const currentRow: any[] = [];

        switch (cleanedFormData.reportType) {
          case "type2":
            if (cleanedFormData.type2Data) {
              currentRow.push(
                i + 1,
                cleanedFormData.type2Data.announceInvestment[i] || "",
                i === 0 ? cleanedFormData.type2Data.dateOfAnnouncement || "" : "",
                cleanedFormData.type2Data.media_platform[i] || ""
              );
            }
            break;
          case "type3":
            if (cleanedFormData.type3Data) {
              currentRow.push(
                i + 1,
                cleanedFormData.type3Data.noim[i] || "",
                cleanedFormData.type3Data.lri[i] || "",
                cleanedFormData.type3Data.sectors[i] || "",
                cleanedFormData.type3Data.elibility[i] || "",
                cleanedFormData.type3Data.description[i] || "",
                cleanedFormData.type3Data.duration[i] || "",
                cleanedFormData.type3Data.aaia[i] || "",
                cleanedFormData.type3Data.noiri2022[i] || "",
                cleanedFormData.type3Data.noiri2023[i] || "",
                cleanedFormData.type3Data.noiri2024[i] || ""
              );
            }
            break;
        }
        allRows.push(currentRow);
      }

      doc.setFontSize(18);
      doc.text(`${reportTitlePrefix}`, 14, 20);
      autoTable(doc, {
        head: [headers],
        body: allRows,
        startY: 30,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [22, 160, 133],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        columnStyles: {
          0: { cellWidth: 30 },
        },
      });
    }

    return doc;
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Generate PDF from template
      const doc = generateTemplatePDF(templateFormData);
      const pdfBlob = doc.output('blob');

      // Upload PDF to storage
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: pdfBlob,
      });
      const { storageId } = await uploadResult.json();

      // Submit report with simple form data + PDF
      await submitReport({
        title: getReportTitle(templateFormData.reportType, currentUser?.state),
        fileId: storageId,
        fileSize: pdfBlob.size,
      });

      toast.success("Report submitted successfully");

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
            <div className="p-4 border border-dashed border-gray-300 rounded-lg">
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
                    <SelectItem value="type1">
                      State Investor Aftercare and Retention Program
                    </SelectItem>
                    <SelectItem value="type2">Announce Investment</SelectItem>
                    <SelectItem value="type3">Inventory Incentive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type 1 Form Fields */}
              {templateFormData.reportType === "type1" && templateFormData.type1Data && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">State Investor Aftercare Retention Program</h4>

                  {renderArrayInputs(
                    "type1Data",
                    "question2",
                    "1. What are the key investment sectors the state has prioritized to provide aftercare and retentions services to?",
                    "Enter the answer",
                    true
                  )}

                  <div className="space-y-2">
                    <Label>
                      2. What is the minimum capital threshold for an investment to be
                      eligible for aftercare and retention services?
                    </Label>
                    <Input
                      name="question3"
                      value={templateFormData.type1Data.question3 || ""}
                      onChange={(e) => handleTemplateDataStringChange(e, "type1Data")}
                      placeholder="Answer"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      3. What is the minimum employment threshold for an investment to be
                      eligible for aftercare and retention services?
                    </Label>
                    <Input
                      name="question4"
                      value={templateFormData.type1Data.question4 || ""}
                      onChange={(e) => handleTemplateDataStringChange(e, "type1Data")}
                      placeholder="Answer"
                      required
                    />
                  </div>

                  {renderArrayInputs(
                    "type1Data",
                    "question5",
                    "4. What additional factors are used to determine eligibility for aftercare and retention services?",
                    "Answer",
                    false
                  )}

                  <div className="space-y-2">
                    <Label>
                      5. How often does the state Investment Promotion Agency plan to
                      engage with investors through formal stakeholder Engagements?
                    </Label>
                    <Input
                      name="question6"
                      value={templateFormData.type1Data.question6 || ""}
                      onChange={(e) => handleTemplateDataStringChange(e, "type1Data")}
                      placeholder="Answer"
                      required
                    />
                  </div>

                  {renderArrayInputs(
                    "type1Data",
                    "question7",
                    "6. What specific services will the state Investment Promotion Agency provide to investors under its aftercare and retention program?",
                    "Answer",
                    false
                  )}

                  {renderArrayInputs(
                    "type1Data",
                    "question8",
                    "7. What kind of assistance will the state Investment Promotion Agency provide to investors on obtaining and renewal of permits and licenses and fulfilling other regulatory compliance obligations?",
                    "Answer",
                    false
                  )}

                  {renderArrayInputs(
                    "type1Data",
                    "question9",
                    "8. Does the State Investment Promotion Agency have a greviance redress mechanism for resolving complaints by Investors?",
                    "Answer",
                    false
                  )}

                  {renderArrayInputs(
                    "type1Data",
                    "question10",
                    "9. Through which channels can investors submit grievances?",
                    "Answer",
                    false
                  )}

                  {renderArrayInputs(
                    "type1Data",
                    "question11",
                    "10. What is the escalation framework if an investor's issue cannot resolved by the Investment Promotion Agency?",
                    "Answer",
                    false
                  )}
                </div>
              )}

              {/* Type 2 Form Fields */}
              {templateFormData.reportType === "type2" && templateFormData.type2Data && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Announce Investment</h4>

                  {renderArrayInputs(
                    "type2Data",
                    "announceInvestment",
                    "Announce Investment Details",
                    "Enter investment detail",
                    false
                  )}

                  <div className="space-y-2">
                    <Label>DATE OF ANNOUNCEMENT</Label>
                    <Input
                      name="dateOfAnnouncement"
                      type="date"
                      value={templateFormData.type2Data.dateOfAnnouncement || ""}
                      onChange={(e) => handleTemplateDataStringChange(e, "type2Data")}
                      required
                    />
                  </div>

                  {renderArrayInputs(
                    "type2Data",
                    "media_platform",
                    "MEDIA OUTLET/PLATFORM WHERE INVESTMENT WAS ANNOUNCED",
                    "Enter details",
                    true
                  )}
                </div>
              )}

              {/* Type 3 Form Fields */}
              {templateFormData.reportType === "type3" && templateFormData.type3Data && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">INVENTORY INCENTIVE</h4>

                  {renderArrayInputs(
                    "type3Data",
                    "noim",
                    "NAME OF INCENTIVE MEASURE",
                    "Enter details",
                    false
                  )}

                  {renderArrayInputs(
                    "type3Data",
                    "lri",
                    "LEGAL REFERENCE INSTRUMENT",
                    "Enter LRI details",
                    false
                  )}

                  {renderArrayInputs(
                    "type3Data",
                    "sectors",
                    "SECTORS",
                    "Enter sector",
                    false
                  )}

                  {renderArrayInputs(
                    "type3Data",
                    "elibility",
                    "ELIGIBILITY CRITERIA",
                    "Enter eligibility criteria",
                    false
                  )}

                  {renderArrayInputs(
                    "type3Data",
                    "description",
                    "DESCRIPTION OF BENEFITS",
                    "Enter description of Benefits",
                    false
                  )}

                  {renderArrayInputs(
                    "type3Data",
                    "duration",
                    "DURATION",
                    "Enter duration",
                    false
                  )}

                  {renderArrayInputs(
                    "type3Data",
                    "aaia",
                    "AWARDING IMPLEMENTING AGENCY",
                    "Enter AIA detail",
                    false
                  )}

                  {yearsToShow.map((year) => (
                    renderArrayInputs(
                      "type3Data",
                      `noiri${year}` as keyof Type3Data,
                      `NUMBER OF INCENTIVES RECIPIENTS IN ${year}`,
                      `Enter ${year} data`,
                      false
                    )
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Submit Report
            </Button>
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
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.status === 'approved' ? 'bg-green-100 text-green-800' :
                          report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(report.submittedAt).toLocaleDateString()}</TableCell>
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
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
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
