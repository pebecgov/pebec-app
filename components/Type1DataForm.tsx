"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  IconButton,
  SelectChangeEvent,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"; // New icon for adding
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline"; // New icon for removing
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const yearsToShow = [currentYear - 3, currentYear - 2, currentYear -1];

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
  dateOfAnnouncement: string[];
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

// Initial state for arrays should start with at least one empty string if you want an initial input field
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
  }
  return base;
};

const DynamicReportForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(
    getInitialFormData("type1")
  );

   

  const handleTypeDataStringChange = <T extends keyof ReportTypeDataMap>(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    type: T
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
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

  const handleTypeDataArrayElementChange = <
    T extends keyof ReportTypeDataMap,
    K extends keyof ReportTypeDataMap[T],
  >(
    type: T,
    fieldName: K,
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const currentTypeData = (prev[type] || {}) as ReportTypeDataMap[T];
      // Ensure currentArray is treated as string[]
      const currentArray = (currentTypeData[fieldName] as string[]).slice(); // Make a shallow copy

      currentArray[index] = value; // Update the specific element

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
    setFormData((prev) => {
      const currentTypeData = (prev[type] || {}) as ReportTypeDataMap[T];
      // Ensure currentArray is treated as string[]
      const currentArray = (currentTypeData[fieldName] as string[]) || []; // Get existing array or empty
      const updatedArray = [...currentArray, ""]; // Add a new empty string

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
    setFormData((prev) => {
      const currentTypeData = (prev[type] || {}) as ReportTypeDataMap[T];
      // Ensure currentArray is treated as string[]
      const currentArray = (currentTypeData[fieldName] as string[]).slice(); // Make a shallow copy

      const updatedArray = currentArray.filter(
        (_, idx) => idx !== indexToRemove
      );

      // Ensure there's always at least one input if the array becomes empty
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

  // Modified renderArrayInputs to support dynamic adding/removing
 const renderArrayInputs = <T extends keyof ReportTypeDataMap, K extends keyof ReportTypeDataMap[T]>(
  type: T,
  fieldName: K,
  label: string,
  placeholder: string,
  required: boolean = false
) => {
  const currentArray = (formData[type]?.[fieldName] as string[] || [""]);
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {label}
        </Typography>
        {currentArray.map((value, index) => (
          <Box
            key={`${String(fieldName)}-${index}`}
            sx={{ display: "flex", alignItems: "center", mb: 1 }}
          >
            <TextField
              fullWidth
              margin="dense" // Use dense margin for multiple inputs
              label={`${placeholder} ${index + 1}`}
              value={value}
              onChange={(e) =>
                handleTypeDataArrayElementChange(
                  type,
                  fieldName,
                  index,
                  e.target.value
                )
              }
              required={required && index === 0} // Only make the first input required
              variant="outlined"
              sx={{ mr: 1 }}
            />
            {currentArray.length > 1 && ( // Only show remove if there's more than one input
              <IconButton
                onClick={() => handleRemoveArrayElement(type, fieldName, index)}
                color="error"
                aria-label={`Remove ${placeholder} ${index + 1}`}
              >
                <RemoveCircleOutlineIcon />
              </IconButton>
            )}
          </Box>
        ))}
        <Button
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => handleAddArrayElement(type, fieldName)}
          variant="outlined"
          size="small"
          sx={{ mt: 1 }}
        >
          Add {placeholder}
        </Button>
      </Box>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const doc = new jsPDF({
      orientation: formData.reportType === "type3" ? "landscape" : "portrait", // Landscape only for type3
      unit: "mm",
    });
    const fileName = `report_data_${formData.reportType}_${new Date().toISOString().slice(0, 10)}.pdf`;

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

      // Prepare text for sections that will be directly printed
      const introductionText = `The purpose of this Investor Aftercare and Retention Strategy document is to articulate a proactive approach to supporting and sustaining investments within our state. Recognizing that the retention and expansion of existing investors is as critical as attracting new ones, this strategy outlines the sectors we prioritize, the criteria for aftercare eligibility, and the mechanisms we will use to deliver consistent and responsive support services to investors.`;
      const criterionText = `Our Aftercare and Retention Program will initially target strategic sectors that align with our state’s development priorities and offer high economic impact. These include :`;
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

      // Prepare text for list items
      const sectorsList =
        type1Data.question2.map((item: string) => ` - ${item}`).join("\n") ||
        "N/A";
      const eligibilityCriteria =
        type1Data.question5.map((item: string) => ` - ${item}`).join("\n") ||
        "N/A";
      const methodsOfDeliveryList =
        type1Data.question7.map((item: string) => ` - ${item}`).join("\n") ||
        "N/A";
      const investorServicesList =
        type1Data.question8.map((item: string) => ` - ${item}`).join("\n") ||
        "N/A";
      const complaintsChannelsList =
        type1Data.question10.map((item: string) => ` - ${item}`).join("\n") ||
        "N/A";
      const escalationSteps =
        type1Data.question11.map((item: string) => ` - ${item}`).join("\n") ||
        "N/A";

      let y = 20; // Starting Y position for content
      const marginX = 14; // Left margin

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("State’s Investor Aftercare and Retention Program", marginX, y);
      y += 10;

      // Introduction
      doc.setFontSize(14); // Bigger font for section title
      doc.setFont("helvetica", "bold");
      doc.text("Introduction", marginX, y);
      y += 7; // Move down for subtitle

      doc.setFontSize(10); // Standard font size for content
      doc.setFont("helvetica", "normal");
      const introLines = doc.splitTextToSize(introductionText, 180); // 180mm width
      introLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 5; // Add some space after the paragraph

      // Criterion for prioritizing investors
      doc.setFontSize(12); // Slightly larger for sub-headings
      doc.setFont("helvetica", "bold");
      doc.text(
        "Criterion for prioritizing investors to receive aftercare and retention services",
        marginX,
        y
      );
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
      // Add list items (sectors)
      const sectorsListLines = doc.splitTextToSize(sectorsList, 170); // Slightly indented for lists
      sectorsListLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX + 5, y); // Indent list items
        y += 6;
      });
      y += 5;

      // Investment Size and Eligibility Criteria
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Investment Size and Eligibility Criteria", marginX, y);
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
      y += 3; // Less space before next line of text

      const investmentCriteriaLines = doc.splitTextToSize(
        investmentCriteriaText,
        180
      );
      investmentCriteriaLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      // Add list items (eligibility)
      const eligibilityLines = doc.splitTextToSize(eligibilityCriteria, 170);
      eligibilityLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX + 5, y);
        y += 6;
      });
      y += 5;

      // Stakeholder Engagement Frequency
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Stakeholder Engagement Frequency", marginX, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const stakeholderLines = doc.splitTextToSize(
        stakeholderEngagementText,
        180
      );
      stakeholderLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 5;

      // Methods of Delivering Aftercare and Retention Services
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Methods of Delivering Aftercare and Retention Services",
        marginX,
        y
      );
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const methodsIntroLines = doc.splitTextToSize(
        methodsOfDeliveryIntro,
        180
      );
      methodsIntroLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      // Add list items (methods)
      const methodsListLines = doc.splitTextToSize(methodsOfDeliveryList, 170);
      methodsListLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX + 5, y);
        y += 6;
      });
      y += 3; // Less space before next line of text

      const digitalPlatformsLines = doc.splitTextToSize(
        digitalPlatformsText,
        180
      );
      digitalPlatformsLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 5;

      // Facilitation of Licensing and Renewals
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Facilitation of Licensing and Renewals", marginX, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const facilitationIntroLines = doc.splitTextToSize(
        facilitationIntro,
        180
      );
      facilitationIntroLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      // Add list items (services)
      const investorServicesListLines = doc.splitTextToSize(
        investorServicesList,
        170
      );
      investorServicesListLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX + 5, y);
        y += 6;
      });
      y += 5;

      // Grievance Redress Mechanism
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Grievance Redress Mechanism", marginX, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const grievanceIntroLines = doc.splitTextToSize(grievanceIntro, 180);
      grievanceIntroLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 3; // Less space before next line of text

      // Channels for Receiving Complaints
      doc.setFontSize(12); // Sub-sub-heading style
      doc.setFont("helvetica", "bold");
      doc.text("Channels for Receiving Complaints", marginX, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const complaintsChannelsIntroLines = doc.splitTextToSize(
        complaintsChannelsIntro,
        180
      );
      complaintsChannelsIntroLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      // Add list items (channels)
      const complaintsChannelsListLines = doc.splitTextToSize(
        complaintsChannelsList,
        170
      );
      complaintsChannelsListLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX + 5, y);
        y += 6;
      });
      y += 5;

      // Issue Escalation Framework
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Issue Escalation Framework", marginX, y);
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
      // Add list items (steps)
      const escalationStepsLines = doc.splitTextToSize(escalationSteps, 170);
      escalationStepsLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX + 5, y);
        y += 6;
      });
      y += 3; // Less space before next line of text

      const escalationConclusionLines = doc.splitTextToSize(
        escalationConclusion,
        180
      );
      escalationConclusionLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 5;

      // Conclusion
      doc.setFontSize(12);
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
      y += 5;
    } else {
      const headers: string[] = [];
      const allRows: any[][] = [];
      let maxRows = 1;
      let typeSpecificData: Type1Data | Type2Data | Type3Data | undefined;
      let reportTitlePrefix = "Saber Agent Report"; // Default prefix

      switch (cleanedFormData.reportType) {
        case "type2":
          reportTitlePrefix = "ANNOUNCE INVESTMENT REPORT";
          typeSpecificData = cleanedFormData.type2Data;
          if (typeSpecificData) {
            headers.push(
              "S.No.",
              "Announce Investment",
              "Date of Announcement",
              "Media Platform"
            );
            maxRows = Math.max(
              maxRows,
              typeSpecificData.announceInvestment.length
            );
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
              "AWARDING IMPLEMENTING AGENCYAWARDING IMPLEMENTING AGENCY",
              `NUMBER OF INCENTIVES RESCIPIENTS IN ${yearsToShow}`,
              "NUMBER OF INCENTIVES RESCIPIENTS IN 2023",
              "NUMBER OF INCENTIVES RESCIPIENTS IN 2024"
            );
            maxRows = Math.max(
              maxRows,
              typeSpecificData.noim.length,
              typeSpecificData.lri.length,
              typeSpecificData.sectors.length,
              typeSpecificData.elibility.length,
              typeSpecificData.description.length,
              typeSpecificData.duration.length,
              typeSpecificData.aaia.length,
              typeSpecificData.noiri2022.length,
              typeSpecificData.noiri2023.length,
              typeSpecificData.noiri2024.length
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
                i === 0
                  ? cleanedFormData.type2Data.dateOfAnnouncement || ""
                  : "",
                i === 0 ? cleanedFormData.type2Data.media_platform || "" : ""
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

    doc.save(fileName);
    toast.success("Form Submitted Successfully");
    setFormData(getInitialFormData("type1"));
  };
  const handleReportTypeChange = (e: SelectChangeEvent) => {
    const newType = e.target.value as FormData["reportType"];
    setFormData(getInitialFormData(newType));
  };
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 800,
        margin: "auto",
        p: 3,
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        boxShadow: "0px 2px 10px rgba(0,0,0,0.05)",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom align="center">
        SABER AGENT REPORT SUBMIT FORM
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel id="report-type-label">Select Report Type</InputLabel>
        <Select
          labelId="report-type-label"
          id="report-type-select"
          value={formData.reportType}
          label="Select Report Type"
          onChange={handleReportTypeChange}
        >
          <MenuItem value="type1">
            State Investor Aftercare and Retention Program
          </MenuItem>
          <MenuItem value="type2">Announce Investment</MenuItem>
          <MenuItem value="type3">Inventory Incentive</MenuItem>
        </Select>
      </FormControl>

      {/* Type 1 Form Fields */}
      {formData.reportType === "type1" && formData.type1Data && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            border: "1px dashed #bdbdbd",
            borderRadius: "4px",
          }}
        >
          <Typography variant="h6" gutterBottom>
            State Investor Aftercare Retention Program
          </Typography>

          {renderArrayInputs(
            "type1Data",
            "question2",
            "1.	What are the key investment sectors the state has prioritized to provide aftercare and retentions services to?",
            "Enter the answer",
            true
          )}
          <Typography
            variant="subtitle1"
            component="label"
            sx={{ mb: 0.5, fontWeight: "medium" }}
          >
            2. What is the minimum capital threshold for an investment to be
            eligible for aftercare and retention services?
          </Typography>
          <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
            <TextField
              fullWidth
              margin="normal"
              name="question3"
              value={formData.type1Data.question3 || ""}
              onChange={(e) => handleTypeDataStringChange(e, "type1Data")}
              placeholder="Answer"
              required
              variant="outlined"
            />
          </Box>
          <Typography
            variant="subtitle1"
            component="label"
            sx={{ mb: 0.5, fontWeight: "medium" }}
          >
            3. What is the minimum employment threshold for an investment to be
            eligible for aftercare and retention services?{" "}
          </Typography>
          <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
            <TextField
              fullWidth
              margin="normal"
              name="question4"
              value={formData.type1Data.question4 || ""}
              onChange={(e) => handleTypeDataStringChange(e, "type1Data")}
              placeholder="Answer."
              required
              variant="outlined"
            />
          </Box>
          {renderArrayInputs(
            "type1Data",
            "question5",
            "4. What additional factors are used to determine eligibility for aftercare and retention services?",
            "Answer.",
            false
          )}
          <Typography
            variant="subtitle1"
            component="label"
            sx={{ mb: 0.5, fontWeight: "medium" }}
          >
            5. How often does the state Investment Promotion Agency plan to
            engage with investors through formal stakeholder Engagements?
          </Typography>
          <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
            <TextField
              fullWidth
              margin="normal"
              name="question6"
              value={formData.type1Data.question6 || ""}
              onChange={(e) => handleTypeDataStringChange(e, "type1Data")}
              placeholder="Answer."
              required
              variant="outlined"
            />
          </Box>

          {renderArrayInputs(
            "type1Data",
            "question7",
            "6.	What specific services will the state Investment Promotion Agency provide to investors under its aftercare and retention program?",
            "Answer.",
            false
          )}
          {renderArrayInputs(
            "type1Data",
            "question8",
            "7.	What kind of assistance will the state Investment Promotion Agency provide to investors on obtaining and renewal of permits and licenses and fulfilling other regulatory compliance obligations?",
            "Answer",
            false
          )}
          {renderArrayInputs(
            "type1Data",
            "question9",
            "8.	Does the State Investment Promotion Agency have a greviance redress mechanism for resolving complaints by Investors?",
            "Answer",
            false
          )}
          {renderArrayInputs(
            "type1Data",
            "question10",
            "9.	Through which channels can investors submit grievances?",
            "Answer.",
            false
          )}
          {renderArrayInputs(
            "type1Data",
            "question11",
            "10.	What is the escalation framework if an investor’s issue cannot resolved by the Investment Promotion Agency?",
            "Answer.",
            false
          )}
        </Box>
      )}

      {/* Type 2 Form Fields */}
      {formData.reportType === "type2" && formData.type2Data && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            border: "1px dashed #bdbdbd",
            borderRadius: "4px",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Announce Investment.
          </Typography>
          {renderArrayInputs(
            "type2Data",
            "announceInvestment",
            "Announce Investment Details",
            "Enter investment detail",
            false
          )}
                
          <Typography variant="subtitle1" component="label"  sx={{ mb: 0.5, fontWeight: 'medium' }}>
           DATE OF ANNOUNCEMENT</Typography>
            <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <TextField
              fullWidth margin="normal"   name="dateOfAnnouncement"
            value={formData.type2Data.dateOfAnnouncement || ""} type="date"
            onChange={(e) => handleTypeDataStringChange(e, "type2Data")}
            placeholder="Answer" required variant="outlined" InputLabelProps={{ shrink: true }}
              />

              
            </Box>
          {/* {renderArrayInputs(
            "type2Data",
            "dateOfAnnouncement",
            "DATE OF ANNOUNCEMENT",
            "Select date",
            type="date",
            true
          )} */}

          {renderArrayInputs(
            "type2Data",
            "media_platform",
            "MEDIA OUTLET/PLATFORM WHERE INVESTMENT WAS ANNOUNCED",
            "Enter details.",
            true
          )}
        </Box>
      )}

      {/* Type 3 Form Fields */}
      {formData.reportType === "type3" && formData.type3Data && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            border: "1px dashed #bdbdbd",
            borderRadius: "4px",
          }}
        >
          <Typography variant="h6" gutterBottom>
            INVENTORY INCENTIVE
          </Typography>
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
            "Enter LRI details.",
            false
          )}
          {renderArrayInputs(
            "type3Data",
            "sectors",
            "SECTORS",
            "Enter sector.",
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
            "Enter description of Benefits.",
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
    `noiri${year}`as keyof Type3Data, 
    `NUMBER OF INCENTIVES RECIPIENTS IN ${year}`,
    `Enter ${year} data`,
    false
  )
))}
        </Box>
      )}

      <Button
        type="submit"
        variant="contained"
        color="success"
        fullWidth
        sx={{ mt: 3 }}
        onClick={handleSubmit}
      >
        Submit Report
      </Button>
    </Box>
  );
};

export default DynamicReportForm;
