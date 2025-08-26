import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// You may need to update this import path if yearsToShow is defined elsewhere
const currentYear = new Date().getFullYear();
const yearsToShow = [currentYear - 3, currentYear - 2, currentYear - 1];

import type { FormData, Type12Data, Type14Data, Type1Data, Type2Data, Type3Data, Type4Data, Type5Data, Type6Data, Type7Data } from "./page";

export function generateTemplatePDF(formData: FormData, currentUserState: string | undefined) {
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
  if (cleanedFormData.type4Data) {
    Object.keys(cleanedFormData.type4Data).forEach((key) => {
      if (Array.isArray(cleanedFormData.type4Data[key])) {
        cleanedFormData.type4Data[key] = cleanedFormData.type4Data[
          key
        ].filter((item: string) => item.trim() !== "");
      }
    });
  }
  if (cleanedFormData.type5Data) {
    Object.keys(cleanedFormData.type5Data).forEach((key) => {
      if (Array.isArray(cleanedFormData.type5Data[key])) {
        cleanedFormData.type5Data[key] = cleanedFormData.type5Data[
          key
        ].filter((item: string) => item.trim() !== "");
      }
    });
  }
  if (cleanedFormData.type7Data) {
    Object.keys(cleanedFormData.type7Data).forEach((key) => {
      if (Array.isArray(cleanedFormData.type7Data[key])) {
        cleanedFormData.type7Data[key] = cleanedFormData.type7Data[
          key
        ].filter((item: string) => item.trim() !== "");
      }
    });
  }
  if (cleanedFormData.type12Data) {
  Object.keys(cleanedFormData.type12Data).forEach((key) => {
    if (Array.isArray(cleanedFormData.type12Data[key])) {
      cleanedFormData.type12Data[key] = cleanedFormData.type12Data[key].filter(
        (item: any) => typeof item === "string" ? item.trim() !== "" : true
      );
    }
  });
}
if  (cleanedFormData.type14Data) {
  Object.keys(cleanedFormData.type14Data).forEach((key) => {
    if (Array.isArray(cleanedFormData.type14Data[key])) {
      cleanedFormData.type14Data[key] = cleanedFormData.type14Data[key].filter(
        (item: any) => typeof item === "string" ? item.trim() !== "" : true
      );
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
    doc.text(`${(currentUserState || "XYZ").toUpperCase()} State's Investor Aftercare and Retention Program`, marginX, y);
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
    y += 5;

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

    // Service Delivery Methods section
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
    y += 5;

    const complaintsChannelsLines = doc.splitTextToSize(complaintsChannelsIntro, 180);
    complaintsChannelsLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 3;

    const channelsLines = doc.splitTextToSize(complaintsChannelsList, 180);
    channelsLines.forEach((line: string) => {
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
  } else if (formData.reportType === "type4" && cleanedFormData.type4Data) {
    // Generate comprehensive Type 4 PDF - State Schedule of Trade-Related Fees Compliance Report
    const type4Data = cleanedFormData.type4Data;
    let y = 20;
    const marginX = 14;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${(currentUserState || "XYZ").toUpperCase()} State Schedule of Trade-Related Fees Compliance Report`, marginX, y);
    y += 15;

    // Introduction
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Introduction", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const introText = `This report outlines the status of compliance with the requirements for publishing a Schedule of Inter-State Trade-Related Fees as per the Disbursement Linked Indicator (DLI). The schedule is intended to consolidate all state-regulated trade-related fees to enhance transparency, reduce informal payments, and ensure efficient payment and collection mechanisms.`;
    const introLines = doc.splitTextToSize(introText, 180);
    introLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // Consolidated Schedule Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Consolidated Schedule of Fees and Levies", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const scheduleText = `The state has developed a consolidated schedule of inter-state trade-related fees and levies, which includes all fees regulated by the state regardless of the agency collecting them. This document provides a comprehensive overview of all fees and levies relating to inter-state movement of goods.\n\nThe document includes the basis of calculation for each fee, even where the tax/revenue law does not specify the amount. Relevant laws, notifications, and regulations (whether part of the consolidated revenue code or not) are referenced and hyperlinked.`;
    const scheduleLines = doc.splitTextToSize(scheduleText, 180);
    scheduleLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Published Document Link:", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(type4Data.publishedDocumentLink || "Not provided", marginX + 45, y);
    y += 10;

    // Legislative Actions Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Legislative and Executive Actions", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const legislativeText = `The state has eliminated haulage-related fees and levies through the following action(s):`;
    doc.text(legislativeText, marginX, y);
    y += 8;

    // Display selected legislative actions
    const selectedActions: string[] = [];
    if (type4Data.legislativeActions.amendmentToRevenueCode) {
      selectedActions.push("Amendment to the existing consolidated revenue code or revenue law, passed by the State House of Assembly and assented to by the Governor");
    }
    if (type4Data.legislativeActions.executiveOrder) {
      selectedActions.push("Executive order by the Governor (if applicable)");
    }

    if (selectedActions.length > 0) {
      selectedActions.forEach((action) => {
        // Use text wrapping for long legislative action text
        const actionLines = doc.splitTextToSize(`• ${action}`, 175);
        actionLines.forEach((line: string, lineIndex: number) => {
          if (y > doc.internal.pageSize.height - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, marginX + 5, y + (lineIndex * 6));
        });
        y += (actionLines.length * 6) + 4; // Add spacing after each action
      });
    } else {
      doc.text(`• No actions selected`, marginX + 5, y);
      y += 6;
    }
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Link to amended law or executive order:", marginX, y);
    y += 8; // More space between label and link
    doc.setFont("helvetica", "normal");
    const linkText = type4Data.amendedLawLink || "Not provided";
    const linkLines = doc.splitTextToSize(linkText, 175);
    linkLines.forEach((line: string, lineIndex: number) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y + (lineIndex * 6)); // Remove the +5 offset to align with margin
    });
    y += (linkLines.length * 6) + 10;

    // Verification Checklist Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Verification Checklist", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Please confirm and provide supporting evidence for the following:", marginX, y);
    y += 8;

    const verificationItems = [
      "A single, consolidated document listing all inter-state trade-related fees and levies is available.",
      "Each fee in the schedule includes a description and basis of estimation, even where amounts are not specified in the law.",
      "The amended revenue law/consolidated code removing haulage fees is published on the state official website.",
      "The removal of haulage fees is clearly reflected in the amended revenue law/consolidated revenue code.",
      "Hyperlinks to relevant revenue laws and regulations are provided in the schedule document."
    ];

    verificationItems.forEach((item, index) => {
      const verificationKey = `verification${index + 1}` as keyof typeof type4Data;
      const verification = type4Data[verificationKey] as { confirmed: boolean; evidence: string };

      if (y > doc.internal.pageSize.height - 25) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, marginX, y);
      doc.setFont("helvetica", "normal");

      // For item 1, modify the text based on the answer
      let displayItem = item;
      if (index === 0) {
        displayItem = verification.confirmed
          ? "A single, consolidated document listing all inter-state trade-related fees and levies is available."
          : "A single, consolidated document listing all inter-state trade-related fees and levies is NOT available.";
      }

      const itemLines = doc.splitTextToSize(displayItem, 170);
      itemLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, marginX + 10, y + (lineIndex * 6));
      });
      y += itemLines.length * 6 + 3;

      // Handle different verification formats based on item index
      if (index === 0) {
        // Item 1: Show "Affirmative" or "Not Affirmative"
        doc.setFont("helvetica", "bold");
        const response = verification.confirmed ? "Affirmative" : "Not Affirmative";
        doc.text(`Response: ${response}`, marginX + 15, y);
        y += 6;
      } else {
        // Items 2-5: Show Yes/No with appropriate evidence
        doc.setFont("helvetica", "bold");
        doc.text(`Answer: ${verification.confirmed ? "Yes" : "No"}`, marginX + 15, y);
        y += 6;

        if (verification.evidence && verification.evidence.trim()) {
          doc.setFont("helvetica", "normal");
          let evidenceLabel = "Evidence:";

          // Determine appropriate label based on item and status
          if (index === 1) {
            evidenceLabel = "Link:";
          } else if (index === 2) {
            evidenceLabel = "Link:";
          } else if (index === 3) {
            evidenceLabel = "Link:";
          } else if (index === 4) {
            evidenceLabel = verification.confirmed ? "Link:" : "Explanation:";
          }

          doc.text(evidenceLabel, marginX + 15, y);
          const evidenceLines = doc.splitTextToSize(verification.evidence, 160);
          evidenceLines.forEach((line: string, lineIndex: number) => {
            doc.text(line, marginX + 35, y + 6 + (lineIndex * 6));
          });
          y += (evidenceLines.length * 6) + 6;
        }
      }
      y += 8;
    });

    // Conclusion Section
    if (y > doc.internal.pageSize.height - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Conclusion", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const conclusionText = `This initiative promotes openness and efficiency in revenue administration. A consolidated and transparent schedule of fees minimizes informal charges and strengthens the investment environment. The removal of unauthorized haulage fees further reinforces the state's commitment to trade facilitation and legal compliance.`;
    const conclusionLines = doc.splitTextToSize(conclusionText, 180);
    conclusionLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
  } else if (formData.reportType === "type5" && cleanedFormData.type5Data) {
    // Generate comprehensive Type 5 PDF - State Committee on Export Promotion (SCEP) Report
    const type5Data = cleanedFormData.type5Data;
    let y = 20;
    const marginX = 14;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${(currentUserState || "XYZ").toUpperCase()} State Committee on Export Promotion (SCEP) Report`, marginX, y);
    y += 15;

    // 1. Introduction
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. Introduction", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const introText = `The State Committee on Export Promotion (SCEP) is established under Act 64 of 1992 and is domiciled in the State Ministry of Commerce and Industry. The committee plays a pivotal role in promoting export activities in the state by leveraging local comparative advantages to enhance economic growth, value chain development, and socioeconomic inclusion.`;
    const introLines = doc.splitTextToSize(introText, 180);
    introLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // 2. Functions of SCEP
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. Functions of SCEP", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const functionsText = `The SCEP performs the following statutory functions:\n• Constitutes a forum for the promotion of principal exportable products of the state.\n• Advises the Nigeria Export Promotion Council (NEPC) on strategies to achieve its mandate in the state.\n• Carries out additional functions as may be directed by the NEPC.`;
    const functionsLines = doc.splitTextToSize(functionsText, 180);
    functionsLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("SCEP Mandate Documentation Link:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const mandateText = type5Data.scepMandateLink || "Not provided";
    const mandateLines = doc.splitTextToSize(mandateText, 175);
    mandateLines.forEach((line: string, lineIndex: number) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y + (lineIndex * 6));
    });
    y += (mandateLines.length * 6) + 10;

    // 3. Export Strategy and Guideline Document
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. Export Strategy and Guideline Document", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const strategyText = `The State has developed a comprehensive Export Strategy and Guidelines Document aimed at:\n• Empowering states and communities through exports\n• Developing product value chains to enhance competitiveness\n• Reducing poverty and fostering socioeconomic inclusion\n\nKey contents of the document include:\n• Sectoral analysis of principal and potential export products\n• Export support strategies (products and market access)\n• Institutional mechanisms and partnerships\n• Strategic activities and timelines`;
    const strategyLines = doc.splitTextToSize(strategyText, 180);
    strategyLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Export Strategy Document Status:", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(type5Data.hasExportStrategy ? "Available" : "Not Available", marginX + 55, y);
    y += 8;

    if (type5Data.hasExportStrategy && type5Data.exportStrategyLink) {
      doc.setFont("helvetica", "bold");
      doc.text("Published Document Link:", marginX, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const linkLines = doc.splitTextToSize(type5Data.exportStrategyLink, 175);
      linkLines.forEach((line: string, lineIndex: number) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y + (lineIndex * 6));
      });
      y += (linkLines.length * 6) + 10;
    }

    // 4. Stakeholder Consultation Process
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. Stakeholder Consultation Process", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const consultationText = `The export strategy was developed in consultation with private sector actors across relevant industries. The consultation process included:\n• Stakeholder meetings/workshops\n• Roundtable discussions with exporters, aggregators, SMEs\n• Inputs from chambers of commerce and cooperative societies\n\nEvidence of consultation:\n• Meeting attendance sheets and signed participant lists\n• Meeting minutes and presentation materials\n• Sample verification with listed private sector representatives`;
    const consultationLines = doc.splitTextToSize(consultationText, 180);
    consultationLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    // Attendance Sheets
    doc.setFont("helvetica", "bold");
    doc.text("Attendance Sheets Link:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const attendanceText = type5Data.stakeholderConsultation.attendanceSheets || "Not provided";
    const attendanceLines = doc.splitTextToSize(attendanceText, 175);
    attendanceLines.forEach((line: string, lineIndex: number) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y + (lineIndex * 6));
    });
    y += (attendanceLines.length * 6) + 6;

    // Meeting Minutes
    doc.setFont("helvetica", "bold");
    doc.text("Meeting Minutes Link:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const minutesText = type5Data.stakeholderConsultation.meetingMinutes || "Not provided";
    const minutesLines = doc.splitTextToSize(minutesText, 175);
    minutesLines.forEach((line: string, lineIndex: number) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y + (lineIndex * 6));
    });
    y += (minutesLines.length * 6) + 6;

    // Private Contributors
    if (type5Data.stakeholderConsultation.privateContributors && type5Data.stakeholderConsultation.privateContributors.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Private Sector Contributors:", marginX, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      type5Data.stakeholderConsultation.privateContributors.forEach((contributor) => {
        if (contributor.trim()) {
          if (y > doc.internal.pageSize.height - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(`• ${contributor}`, marginX + 5, y);
          y += 6;
        }
      });
      y += 6;
    }

    // Feedback Summary
    if (type5Data.stakeholderConsultation.feedbackSummary) {
      doc.setFont("helvetica", "bold");
      doc.text("Private Sector Feedback Summary:", marginX, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const feedbackLines = doc.splitTextToSize(type5Data.stakeholderConsultation.feedbackSummary, 180);
      feedbackLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 6;
      });
      y += 10;
    }

    // 5. Operational Budget Allocation
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("5. Operational Budget Allocation", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const budgetText = `The SCEP has been allocated an operational budget in the state's approved fiscal budget for 2024 and 2025. This funding supports its activities including training, sensitization, research, and implementation of the export strategy.`;
    const budgetLines = doc.splitTextToSize(budgetText, 180);
    budgetLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Budget Documents Link:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const budgetDocText = type5Data.budgetDocuments || "Not provided";
    const budgetDocLines = doc.splitTextToSize(budgetDocText, 175);
    budgetDocLines.forEach((line: string, lineIndex: number) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y + (lineIndex * 6));
    });
    y += (budgetDocLines.length * 6) + 10;

    // 6. Implementation Activities and Institutional Mechanism
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("6. Implementation Activities and Institutional Mechanism", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const implementationText = `The strategy identifies a set of prioritized activities and the corresponding agencies responsible for delivery. Activities include:\n• Capacity building programs for MSMEs\n• Market expansion support (trade fairs, match-making)\n• Export readiness assessments and trainings\n• Compliance and product certification support\n\nInstitutional mechanisms include:\n• Technical working groups\n• Public-private export facilitation platforms\n• Monthly coordination meetings`;
    const implementationLines = doc.splitTextToSize(implementationText, 180);
    implementationLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    // Implementation Reports
    if (type5Data.implementationReports && type5Data.implementationReports.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Implementation Activity Reports:", marginX, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      type5Data.implementationReports.forEach((report, index) => {
        if (report.trim()) {
          if (y > doc.internal.pageSize.height - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${index + 1}. ${report}`, marginX + 5, y);
          y += 6;
        }
      });
      y += 10;
    }

    // 7. Conclusion
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("7. Conclusion", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const conclusionText = `The State Committee on Export Promotion represents a strategic commitment to diversify the state economy through increased non-oil exports. With an inclusive export strategy, strong private sector engagement, and a results-oriented approach, the state aims to position itself competitively in regional and global markets.`;
    const conclusionLines = doc.splitTextToSize(conclusionText, 180);
    conclusionLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // Checklist Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Checklist of Required Attachments/Links", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Please ensure the following are included in your submission:", marginX, y);
    y += 8;

    const checklistItems = [
      { key: "exportStrategyDoc", label: "Export Strategy and Guidelines Document (PDF or Word)" },
      { key: "publicationLink", label: "Publication link to state website hosting the strategy" },
      { key: "attendanceSheets", label: "Signed meeting attendance sheets and consultation minutes" },
      { key: "privateContributors", label: "Names/contacts of sampled private sector contributors" },
      { key: "budgetLineItems", label: "Budget line items from FY2024 and FY2025 budgets" },
      { key: "nepcCertification", label: "NEPC certification baseline data and 2025 firm data" },
      { key: "exportActivities", label: "Evidence of export promotion activities executed by the SCEP" },
      { key: "institutionalFramework", label: "Institutional mechanism and implementation framework" }
    ];

    checklistItems.forEach((item) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }

      const isChecked = type5Data.checklist[item.key] || false;
      const checkSymbol = isChecked ? "☑" : "☐";
      doc.text(`${checkSymbol} ${item.label}`, marginX, y);
      y += 6;
    });
  } else if (formData.reportType === "type6" && cleanedFormData.type6Data) {
    // Generate comprehensive Type 6 PDF - Grievance Redress Mechanism (GRM) Report
    const type6Data = cleanedFormData.type6Data;
    let y = 20;
    const marginX = 14;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${(currentUserState || "XYZ").toUpperCase()} Grievance Redress Mechanism (GRM) Report`, marginX, y);
    y += 15;

    // 1. Introduction
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. Introduction", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const introText = `Our state has established a formal Grievance Redress Mechanism (GRM) in compliance with the DLI requirements to manage complaints by truckers, transporters, and traders involved in inter-state movement of goods. This GRM is designed to ensure that stakeholder concerns are handled in a structured, transparent, time-bound, and accountable manner and supports the goal of improved ease of doing business.`;
    const introLines = doc.splitTextToSize(introText, 180);
    introLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // 2. GRM Structure and Objective
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. GRM Structure and Objective", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const structureText = `The GRM functions as a responsive platform to:\n• Enable users to raise grievances related to inter-state trade.\n• Provide timely redress to mitigate or resolve potential or realized negative impacts arising from the services of relevant MDAs.`;
    const structureLines = doc.splitTextToSize(structureText, 180);
    structureLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text(`The GRM is managed by: ${type6Data.responsibleAgency || "Not specified"}`, marginX, y);
    y += 10;

    // 3. Channels for Receiving Complaints
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. Channels for Receiving Complaints", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Complaints may be submitted through the following functional channels:", marginX, y);
    y += 8;

    // Complaint channels
    doc.setFont("helvetica", "bold");
    doc.text("Telephone:", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(type6Data.complaintChannels.telephone || "Not provided", marginX + 25, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Email:", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(type6Data.complaintChannels.email || "Not provided", marginX + 20, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Walk-in Complaint Desk:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const walkInText = type6Data.complaintChannels.walkInAddress || "Not provided";
    const walkInLines = doc.splitTextToSize(walkInText, 160);
    walkInLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX + 10, y);
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Online Form/Portal:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const portalText = type6Data.complaintChannels.onlinePortal || "Not provided";
    const portalLines = doc.splitTextToSize(portalText, 160);
    portalLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX + 10, y);
      y += 6;
    });
    y += 10;

    // 4. Complaint Registration and Documentation System
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. Complaint Registration and Documentation System", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const registrationText = `The GRM includes a manual or electronic recording system for tracking each grievance. This system records the following mandatory details:\n• Complainant's name and contact information\n• Date received\n• Type and description of complaint\n• Amount lost (if any)\n• Action taken or solvency mechanism used\n• Name of responsible handling officer/department\n• Date of response to complainant`;
    const registrationLines = doc.splitTextToSize(registrationText, 180);
    registrationLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("System Link:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const systemLinkText = type6Data.registrationSystem.systemLink || "Not provided";
    const systemLinkLines = doc.splitTextToSize(systemLinkText, 160);
    systemLinkLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("System Screenshot:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const screenshotText = type6Data.registrationSystem.systemScreenshot || "Not provided";
    const screenshotLines = doc.splitTextToSize(screenshotText, 160);
    screenshotLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // 5. Service Level Agreement (SLA) Compliance
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("5. Service Level Agreement (SLA) Compliance", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const slaText = `A Service Level Agreement (SLA) has been jointly developed by the State Ministry of Trade and Investment, State Internal Revenue Agency, and the State Ministry of Justice.`;
    const slaLines = doc.splitTextToSize(slaText, 180);
    slaLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`Timeline for acknowledgement: ${type6Data.slaDetails.acknowledgementTime || "Not specified"}`, marginX, y);
    y += 6;
    doc.text(`Timeline for resolution: ${type6Data.slaDetails.resolutionTime || "Not specified"}`, marginX, y);
    y += 8;

    doc.text("SLA Document Link:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const slaDocText = type6Data.slaDetails.slaDocument || "Not provided";
    const slaDocLines = doc.splitTextToSize(slaDocText, 160);
    slaDocLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // 6. Performance Tracking and SLA Adherence
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("6. Performance Tracking and SLA Adherence", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const performanceText = `Each complaint is tracked from the date of receipt to the date of resolution. The responsible agency prepares quarterly reports indicating complaint statistics and resolution timeframes.`;
    const performanceLines = doc.splitTextToSize(performanceText, 180);
    performanceLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("For the current reporting period:", marginX, y);
    y += 6;
    doc.text(`Total complaints received: ${type6Data.performanceData.totalComplaints || "Not specified"}`, marginX, y);
    y += 6;
    doc.text(`Complaints resolved within SLA timeframe: ${type6Data.performanceData.resolvedWithinSLA || "Not specified"}`, marginX, y);
    y += 6;
    doc.text(`Percentage resolved: ${type6Data.performanceData.percentageResolved || "Not specified"}`, marginX, y);
    y += 6;
    doc.text(`SLA compliance threshold met: ${type6Data.performanceData.slaComplianceMet ? "Yes" : "No"}`, marginX, y);
    y += 8;

    doc.text("Quarterly Report Link:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const quarterlyReportText = type6Data.performanceData.quarterlyReport || "Not provided";
    const quarterlyReportLines = doc.splitTextToSize(quarterlyReportText, 160);
    quarterlyReportLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // 7. Issue Escalation Framework
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("7. Issue Escalation Framework", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const escalationText = `We maintain an escalation structure to resolve complaints that cannot be addressed by the frontline Investment Promotion or Trade Facilitation Agency. This includes:\n• First Level: GRM Officer at MDA level\n• Second Level: Senior Management of Coordinating Agency\n• Third Level: Inter-ministerial committee for inter-state trade facilitation\n• Fourth Level: State Executive escalation or relevant Judicial Panel`;
    const escalationLines = doc.splitTextToSize(escalationText, 180);
    escalationLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Escalation Chart:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const escalationChartText = type6Data.escalationFramework.escalationChart || "Not provided";
    const escalationChartLines = doc.splitTextToSize(escalationChartText, 160);
    escalationChartLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("SOP Document:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const sopText = type6Data.escalationFramework.sopDocument || "Not provided";
    const sopLines = doc.splitTextToSize(sopText, 160);
    sopLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // 8. Stakeholder Communication and Feedback
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("8. Stakeholder Communication and Feedback", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const communicationText = `All stakeholders are informed of the GRM via:\n• Public awareness campaigns\n• Posters at trade checkpoints and transport hubs\n• Training and sensitization workshops\n• State website publications`;
    const communicationLines = doc.splitTextToSize(communicationText, 180);
    communicationLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Campaign Evidence:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const campaignText = type6Data.communicationEvidence.campaignEvidence || "Not provided";
    const campaignLines = doc.splitTextToSize(campaignText, 160);
    campaignLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Online Materials:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const onlineText = type6Data.communicationEvidence.onlineMaterials || "Not provided";
    const onlineLines = doc.splitTextToSize(onlineText, 160);
    onlineLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // 9. Conclusion
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("9. Conclusion", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const conclusionText = `Our commitment to grievance redress is rooted in the principle that timely and fair resolution of complaints is critical to improving the investment climate. By ensuring that the voices of truckers, traders, and business actors are heard and addressed, the state fosters trust, enhances trade facilitation, and upholds its reputation as a responsible partner in business growth.`;
    const conclusionLines = doc.splitTextToSize(conclusionText, 180);
    conclusionLines.forEach((line: string) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    });
    y += 10;

    // Checklist Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Checklist of Required Attachments/Links", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Please ensure the following are included in your submission:", marginX, y);
    y += 8;

    const grmChecklistItems = [
      { key: "complaintLogbook", label: "GRM complaint logbook or screenshot of digital system" },
      { key: "slaDocument", label: "GRM SLA document (signed or published version)" },
      { key: "quarterlyReport", label: "Quarterly complaint resolution report" },
      { key: "escalationSOP", label: "SOP or chart for escalation process" },
      { key: "communicationMaterials", label: "Public communication materials or media links" }
    ];

    grmChecklistItems.forEach((item) => {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }

      const isChecked = type6Data.checklist[item.key] || false;
      const checkSymbol = isChecked ? "☑" : "☐";
      doc.text(`${checkSymbol} ${item.label}`, marginX, y);
      y += 6;
    });
  }
else if (cleanedFormData.reportType === "type7" && cleanedFormData.type7Data) {
  const {
    reportPublishedSelect,
    grevianceMechSelect,
    year2024Link,
    year2025Link,
    grievianvceMechanismLink,
  } = cleanedFormData.type7Data;

  // Initialize page settings and variables
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 25;
  const marginRight = 25;
  const maxWidth = pageWidth - marginLeft - marginRight;
  let y = 30;
  let currentPage = 1;

  // Enhanced styling functions
  const addTitle = (text: string) => {
    if (y + 25 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }
    
    // Add background rectangle for title
    doc.setFillColor(41, 128, 185); // Professional blue
    doc.rect(marginLeft - 5, y - 15, maxWidth + 10, 20, 'F');
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); // White text
    
    // Center the title
    const textWidth = doc.getTextWidth(text);
    const centerX = (pageWidth - textWidth) / 2;
    doc.text(text, centerX, y);
    y += 25;
    doc.setTextColor(0, 0, 0); // Reset to black
  };

  const addHeader = (text: string, spacing = 15) => {
    if (y + 16 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    y += spacing;
    
    // Add subtle background for headers
    doc.setFillColor(236, 240, 241); // Light gray
    doc.rect(marginLeft - 2, y - 12, maxWidth + 4, 16, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(52, 73, 94); // Dark blue-gray
    doc.text(text, marginLeft, y);
    y += 8;
    
    // Add underline
    doc.setDrawColor(52, 73, 94);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + maxWidth, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const addSubHeader = (text: string, spacing = 10) => {
    if (y + 12 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    y += spacing;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185); // Blue
    doc.text(text, marginLeft, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const addParagraph = (text: string, spacing = 6, indent = 0) => {
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    const requiredHeight = lines.length * spacing + 5;

    if (y + requiredHeight > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80); // Dark gray for better readability

    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    lines.forEach((line, index) => {
      const currentX = marginLeft + indent;
      const urls = line.match(urlRegex);
      
      if (urls) {
        let startX = currentX;
        const parts = line.split(urlRegex);

        parts.forEach((part) => {
          if (urlRegex.test(part)) {
            doc.setTextColor(41, 128, 185); // Blue for links
            doc.setFont("helvetica", "normal");
            doc.textWithLink(part, startX, y, { url: part });
            const partWidth = doc.getTextWidth(part);
            startX += partWidth;
          } else {
            doc.setTextColor(44, 62, 80);
            doc.text(part, startX, y);
            const partWidth = doc.getTextWidth(part);
            startX += partWidth;
          }
        });
      } else {
        doc.setTextColor(44, 62, 80);
        doc.text(line, currentX, y);
      }

      y += spacing;
    });

    y += 3; // Extra spacing after paragraph
    doc.setTextColor(0, 0, 0);
  };

  const addBulletPoint = (text: string, spacing = 6) => {
    const bulletText = `• ${text}`;
    addParagraph(bulletText, spacing, 5);
  };

  const addKeyValuePair = (key: string, value: string, spacing = 8) => {
    if (y + 12 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    // Add background for key-value pairs
    doc.setFillColor(249, 249, 249);
    doc.rect(marginLeft - 2, y - 3, maxWidth + 4, 12, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);
    doc.text(`${key}:`, marginLeft, y + 5);

    const keyWidth = doc.getTextWidth(`${key}: `);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(44, 62, 80);
    
    // Handle long values by wrapping
    const valueLines = doc.splitTextToSize(value || "N/A", maxWidth - keyWidth - 10);
    valueLines.forEach((line, index) => {
      if (key === "GRM System Link" && value && value.startsWith("http")) {
        doc.setTextColor(41, 128, 185);
        doc.textWithLink(line, marginLeft + keyWidth + 5, y + 5 + (index * spacing), { url: value });
      } else {
        doc.text(line, marginLeft + keyWidth + 5, y + 5 + (index * spacing));
      }
    });

    y += Math.max(12, valueLines.length * spacing + 4);
    doc.setTextColor(0, 0, 0);
  };

  const addPerformanceCard = (year: string, link: string, targetPercentage: string, description: string) => {
    if (y + 40 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    // Add card background with lighter performance color coding
    const performanceColors = {
      "2024": {
        border: [52, 152, 219],    // Blue border
        background: [230, 245, 255], // Light blue background
        badge: [41, 128, 185]       // Darker blue for badge
      },
      "2025": {
        border: [46, 204, 113],     // Green border  
        background: [230, 255, 240], // Light green background
        badge: [39, 174, 96]        // Darker green for badge
      }
    };

    const colors = performanceColors[year as keyof typeof performanceColors] || performanceColors["2024"];
    
    // Card background - much lighter
    doc.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(1);
    doc.rect(marginLeft, y, maxWidth, 35, 'FD');

    y += 12;

    // Year header - darker color for contrast
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.badge[0], colors.badge[1], colors.badge[2]);
    doc.text(`${year} Performance Report`, marginLeft + 5, y);
    y += 8;

    // Target percentage badge - solid background with white text
    doc.setFillColor(colors.badge[0], colors.badge[1], colors.badge[2]);
    doc.rect(marginLeft + 5, y - 5, 60, 10, 'F');
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); // White text on solid background
    doc.text(`Target: ${targetPercentage}`, marginLeft + 8, y + 1);

    // Description - dark text for readability
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(33, 37, 41); // Very dark gray
    doc.text(description, marginLeft + 75, y + 1);
    y += 8;

    // Link
    if (link && link !== "N/A") {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(41, 128, 185); // Blue for links
      const linkText = link.length > 60 ? link.substring(0, 57) + "..." : link;
      doc.textWithLink(`Report Link: ${linkText}`, marginLeft + 8, y, { url: link });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(108, 117, 125); // Medium gray for "not available"
      doc.text("Report Link: Not Available", marginLeft + 8, y);
    }

    y += 15;
    doc.setTextColor(0, 0, 0);
  };

  const addDivider = () => {
    y += 5;
    doc.setDrawColor(189, 195, 199);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + maxWidth, y);
    y += 10;
  };

  const addInfoBox = (title: string, content: string, type: "info" | "warning" | "success" = "info") => {
    if (y + 30 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    const colors = {
      info: {
        border: [52, 152, 219],     // Blue border
        background: [230, 245, 255], // Light blue background
        title: [41, 128, 185]        // Darker blue for title
      },
      warning: {
        border: [243, 156, 18],      // Orange border
        background: [255, 248, 230], // Light orange background
        title: [211, 134, 15]        // Darker orange for title
      },
      success: {
        border: [46, 204, 113],      // Green border
        background: [230, 255, 240], // Light green background
        title: [39, 174, 96]         // Darker green for title
      }
    };

    const color = colors[type];
    
    // Box background - much lighter
    doc.setFillColor(color.background[0], color.background[1], color.background[2]);
    doc.setDrawColor(color.border[0], color.border[1], color.border[2]);
    doc.setLineWidth(1);
    
    const boxHeight = 25;
    doc.rect(marginLeft, y, maxWidth, boxHeight, 'FD');

    y += 8;

    // Title - darker color for better contrast
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color.title[0], color.title[1], color.title[2]);
    doc.text(title, marginLeft + 5, y);
    y += 8;

    // Content - dark text for readability
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(33, 37, 41); // Very dark gray, almost black
    const contentLines = doc.splitTextToSize(content, maxWidth - 10);
    contentLines.forEach((line, index) => {
      doc.text(line, marginLeft + 5, y + (index * 6));
    });

    y += Math.max(12, contentLines.length * 6 + 5);
    doc.setTextColor(0, 0, 0);
  };

  const addFooterToCurrentPage = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 140, 141);
    doc.text(`Page ${currentPage}`, pageWidth - 40, pageHeight - 15);
    doc.text("Generated on: " + new Date().toLocaleDateString(), marginLeft, pageHeight - 15);
    doc.setTextColor(0, 0, 0);
  };

  // Main document generation
  addTitle("Grievance Redress Mechanism (GRM)");
  addSubHeader("Comprehensive Compliance and Verification Report");

  addHeader("Executive Summary");
  addParagraph(
    "This comprehensive report provides detailed analysis and compliance verification of operational Grievance Redress Mechanisms (GRMs) implemented across two key Business Enabling Environment (BEE) State Ministry, Department, and Agency (MDA) entities. The assessment aligns with the State Action on Business Enabling Reforms (SABER) Verification Protocol Version 3.0 (March 5, 2024), ensuring systematic evaluation of GRM operational status, response effectiveness, and grievance resolution outcomes within established Service Level Agreement (SLA) timeframes."
  );

  addDivider();

  addHeader("Introduction and Regulatory Context");
  addParagraph(
    "This verification report examines the implementation and operational effectiveness of Grievance Redress Mechanisms within designated BEE State MDAs, providing stakeholders with comprehensive insights into complaint handling processes, resolution timelines, and institutional responsiveness. The assessment encompasses both manual and digital grievance management systems, ensuring comprehensive coverage of all available complaint channels."
  );

  addParagraph(
    "The evaluation framework emphasizes transparency, accountability, and institutional trust-building through systematic documentation of grievance handling processes, response timelines, and resolution outcomes. This approach supports the development of an inclusive business environment where concerns can be addressed efficiently and effectively."
  );

  addDivider();

  addHeader("GRM System Architecture and Components");
  addSubHeader("Core System Requirements");

  addParagraph(
    "Each designated BEE MDA operates a comprehensive and functional GRM system designed to capture, process, and resolve grievances through established protocols. The system architecture incorporates both manual and digital components to ensure accessibility and comprehensive coverage of all stakeholder concerns."
  );

  addInfoBox(
    "Essential GRM Data Elements",
    "All GRM systems must capture: Complainant identification and contact details, Grievance receipt date and classification, Comprehensive issue description and documentation, MDA response and acknowledgement timestamps, Resolution status and outcome documentation",
    "info"
  );

  addSubHeader("Minimum Data Collection Standards");
  addParagraph("The GRM framework requires systematic collection of the following essential information elements:");

  addBulletPoint("Complete complainant identification including name and verified contact information");
  addBulletPoint("Comprehensive contact details enabling effective communication throughout the resolution process");
  addBulletPoint("Precise grievance receipt date with timestamping for accountability and tracking purposes");
  addBulletPoint("Detailed description of the issue including relevant documentation and supporting evidence");
  addBulletPoint("Official MDA response date and acknowledgement confirmation with responsible officer identification");
  addBulletPoint("Resolution timeline tracking with intermediate status updates and final outcome documentation");

  addDivider();

  addHeader("System Implementation Assessment");
  addSubHeader("Operational Status Verification");

  addKeyValuePair("GRM System Operational Status", grevianceMechSelect);
  
  if (grievianvceMechanismLink && grievianvceMechanismLink !== "N/A") {
    addKeyValuePair("GRM System Access Link", grievianvceMechanismLink);
    
    addInfoBox(
      "System Accessibility Confirmation",
      "The GRM system link has been provided and should be tested for functionality, user accessibility, and complaint submission capabilities during the verification process.",
      "success"
    );
  } else {
    addInfoBox(
      "System Access Information Required",
      "GRM system access information is currently not available. Please provide the official GRM portal link or alternative access method for comprehensive verification.",
      "warning"
    );
  }

  addDivider();

  addHeader("Performance Metrics and SLA Compliance");
  addSubHeader("Annual Performance Analysis");

  addParagraph(
    "The GRM performance evaluation encompasses multi-year analysis to demonstrate progressive improvement in grievance resolution effectiveness. Performance targets increase annually to ensure continuous enhancement of service delivery standards."
  );

  // Performance cards for each year
  addPerformanceCard(
    "2024 (Year 2)", 
    year2024Link, 
    "50%", 
    "Minimum threshold for grievances resolved within SLA timeline"
  );

  addPerformanceCard(
    "2025 (Year 3)", 
    year2025Link, 
    "75%", 
    "Enhanced target demonstrating improved resolution efficiency"
  );

  addSubHeader("Performance Improvement Trajectory");
  addParagraph(
    "The progressive increase in resolution targets from 50% in Year 2 to 75% in Year 3 demonstrates the state's commitment to continuous improvement in grievance handling efficiency. This structured approach ensures systematic enhancement of institutional responsiveness while maintaining quality standards in complaint resolution."
  );

  addDivider();

  addHeader("Communication Channel Verification");
  addSubHeader("Responsiveness Testing Protocol");

  addParagraph(
    "Comprehensive verification of published contact information ensures that businesses and citizens can effectively access GRM services during designated operational periods. The Independent Verification Agent (IVA) conducts systematic testing of all published communication channels."
  );

  addInfoBox(
    "Verification Testing Standards",
    "Contact verification includes: 72-hour maximum testing window, Multiple contact attempt documentation, Response quality and information accuracy assessment, Operational hours verification and accessibility confirmation",
    "info"
  );

  addSubHeader("Testing Documentation Requirements");
  addParagraph("The communication channel verification process requires comprehensive documentation including:");

  addBulletPoint("Precise date and time stamps for each contact attempt within the 72-hour testing window");
  addBulletPoint("Detailed MDA response documentation including both automated acknowledgements and human interactions");
  addBulletPoint("Assessment of information clarity including location details and operational hour confirmation");
  addBulletPoint("Response quality evaluation focusing on helpfulness and accuracy of provided information");
  addBulletPoint("Accessibility verification during published operational hours with multiple communication methods tested");

  addDivider();

  addHeader("Quality Assurance and Verification Standards");
  addSubHeader("Documentation and Evidence Requirements");

  addParagraph(
    "Comprehensive verification requires systematic collection and maintenance of supporting documentation to ensure transparency and accountability in the GRM assessment process. All evidence must be timestamped and independently verifiable."
  );

  addSubHeader("Required Supporting Materials");
  addParagraph("The verification process mandates collection of the following supporting documentation:");

  addBulletPoint("System screenshots demonstrating GRM portal functionality and user interface accessibility");
  addBulletPoint("Grievance registers showing complaint intake, processing, and resolution tracking");
  addBulletPoint("Service Level Agreement documents outlining response timelines and resolution commitments");
  addBulletPoint("Website publication links providing public access to GRM information and submission processes");
  addBulletPoint("Communication testing logs with timestamped contact attempts and response documentation");

  addDivider();

  addHeader("Institutional Impact and Benefits");
  addSubHeader("Transparency and Trust Building");

  addParagraph(
    "The implementation of comprehensive GRM systems delivers significant institutional benefits that extend beyond individual complaint resolution. These mechanisms serve as fundamental pillars of good governance and public accountability."
  );

  addSubHeader("Strategic Advantages");
  addParagraph("Effective GRM implementation provides multiple strategic benefits:");

  addBulletPoint("Enhanced institutional transparency through systematic complaint handling and public reporting");
  addBulletPoint("Strengthened public trust through reliable grievance resolution and responsive communication");
  addBulletPoint("Improved business environment through predictable complaint resolution processes and clear escalation paths");
  addBulletPoint("Risk mitigation through early identification of systemic issues and proactive resolution strategies");
  addBulletPoint("Regulatory compliance demonstration supporting broader governance and accountability objectives");

  addDivider();

  addHeader("Recommendations for System Enhancement");
  addSubHeader("Continuous Improvement Opportunities");

  addParagraph("Based on the verification assessment, the following recommendations support ongoing GRM effectiveness:");

  addBulletPoint("Implement automated tracking systems for enhanced complaint monitoring and resolution timeline management");
  addBulletPoint("Develop comprehensive staff training programs focusing on customer service excellence and technical competency");
  addBulletPoint("Establish regular system audits ensuring consistent performance standards and identifying improvement opportunities");
  addBulletPoint("Create stakeholder feedback mechanisms enabling continuous system refinement based on user experience");
  addBulletPoint("Implement cross-MDA knowledge sharing protocols facilitating best practice dissemination and standardization");

  addDivider();

  addHeader("Conclusion");
  addParagraph(
    "This comprehensive verification framework provides structured validation of GRM functionality and institutional responsiveness across designated BEE State MDAs. The systematic approach ensures transparency, accountability, and continuous improvement in grievance resolution processes while building sustainable trust between government institutions and the business community."
  );

  addParagraph(
    "The progressive performance targets and comprehensive documentation requirements demonstrate the state's commitment to excellence in public service delivery. Continued implementation of these standards will further enhance the business enabling environment while maintaining high standards of institutional accountability and citizen satisfaction."
  );


  // Add footer to the final page
  addFooterToCurrentPage();
}
  else if (formData.reportType === "type8" && cleanedFormData.type8Data) {
    const type8Data = cleanedFormData.type8Data;
    let y = 30;
    const marginX = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const state = (currentUserState || "XYZ").toUpperCase();
    const address = type8Data.courtAddress || "[Court Address]";
    const day = type8Data.dayOf || "[Day]";
    const month = type8Data.month || "[Month]";
    const year = type8Data.year || "[Year]";
    const nameOfMagistrate = type8Data.nameOfMagistrate || "[Name of Magistrate]";
    const signature = type8Data.signature || "[Signature]";

    // Header - Centered
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${state} STATE JUDICIARY`, centerX, y, { align: "center" });
    y += 10;
    doc.text("SMALL CLAIMS COURT", centerX, y, { align: "center" });
    y += 10;
    doc.setFontSize(13);
    doc.text("CERTIFICATE OF AUTHENTICATION OF SMALL CLAIMS COURT REPORTS", centerX, y, { align: "center" });
    y += 18; // Extra padding below the last header

    // Body - Larger font and more padding between paragraphs
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    const certText1 = `This is to certify that the Time to Disposition Report of ${state} State Small Claims Court No 1 sitting at ${address} uploaded on the judiciary's website from January to December ${year} are genuine and accurate documents.`;
    const certText2 = `I verify that the reports have not been altered or tampered with and accurately reflects the performance of the SCC1 ${address}.`;
    const certLines1 = doc.splitTextToSize(certText1, 170);
    certLines1.forEach((line) => {
      doc.text(line, marginX, y);
      y += 8;
    });
    y += 6; // Padding between paragraphs
    const certLines2 = doc.splitTextToSize(certText2, 170);
    certLines2.forEach((line) => {
      doc.text(line, marginX, y);
      y += 8;
    });
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text(`Dated this ${day} day of ${month} ${year}`, marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Name of Magistrate: ${nameOfMagistrate}`, marginX, y);
    y += 10;
    doc.text(`Signature: ${signature}`, marginX, y);
    return doc;
  } else if (formData.reportType === "type9" && cleanedFormData.type9Data) {
    const type9Data = cleanedFormData.type9Data;
    let y = 30;
    const marginX = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const state = (currentUserState || "XYZ").toUpperCase();
    const address = type9Data.courtAddress || "[Court Address]";
    const day = type9Data.dayOf || "[Day]";
    const month = type9Data.month || "[Month]";
    const year = type9Data.year || "[Year]";
    const nameOfSheriff = type9Data.nameOfSheriff || "[Name of Sheriff]";
    const signature = type9Data.signature || "[Signature]";

    // Header - Centered
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${state} STATE JUDICIARY`, centerX, y, { align: "center" });
    y += 10;
    doc.text("SMALL CLAIMS COURT", centerX, y, { align: "center" });
    y += 10;
    doc.setFontSize(13);
    doc.text("CERTIFICATE OF AUTHENTICATION OF SMALL CLAIMS COURT EXECUTION REPORTS", centerX, y, { align: "center" });
    y += 18; // Extra padding below the last header

    // Body - Larger font and more padding between paragraphs
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    const certText1 = `This is to certify that the Execution Report of ${state} State Small Claims Court No 1 sitting at ${address} uploaded on the judiciary's website from January to December ${year} are genuine and accurate documents.`;
    const certText2 = `I verify that the reports have not been altered or tampered with and accurately reflects the execution performance of the SCC1 ${address}.`;
    const certLines1 = doc.splitTextToSize(certText1, 170);
    certLines1.forEach((line) => {
      doc.text(line, marginX, y);
      y += 8;
    });
    y += 6; // Padding between paragraphs
    const certLines2 = doc.splitTextToSize(certText2, 170);
    certLines2.forEach((line) => {
      doc.text(line, marginX, y);
      y += 8;
    });
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text(`Dated this ${day} day of ${month} ${year}`, marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Name of Sheriff: ${nameOfSheriff}`, marginX, y);
    y += 10;
    doc.text(`Signature: ${signature}`, marginX, y);
    return doc;
  } else if (formData.reportType === "type10" && cleanedFormData.type10Data) {
    // Use landscape orientation for type10
    const docLandscape = new jsPDF({ orientation: "landscape", unit: "mm" });
    const type10Data = cleanedFormData.type10Data;
    let y = 30;
    const marginX = 20;
    const pageWidth = docLandscape.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const state = (currentUserState || "XYZ").toUpperCase();
    const month = type10Data.month || "[Month]";
    const year = type10Data.year || "[Year]";
    const address = type10Data.address || "[Court Address]";
    const numberOfCasesExecuted = type10Data.numberOfCasesExecuted || "";
    const numberOfCasesNotExecuted = type10Data.numberOfCasesNotExecuted || "";
    const nameOfDeputySheriff = type10Data.nameOfDeputySheriff || "";
    const date = type10Data.date || "";
    const signature = type10Data.signature || "";

    // Header
    docLandscape.setFontSize(16);
    docLandscape.setFont("helvetica", "bold");
    docLandscape.text(`${state} STATE JUDICIARY`, centerX, y, { align: "center" });
    y += 10;
    docLandscape.text("SMALL CLAIMS COURT", centerX, y, { align: "center" });
    y += 10;
    docLandscape.setFontSize(13);
    docLandscape.text(`EXECUTION REPORT FOR THE MONTH OF ${month.toUpperCase()}, ${year}`, centerX, y, { align: "center" });
    y += 10;
    docLandscape.text(`SMALL CLAIMS COURT NO 1 ${address.toUpperCase()}`, centerX, y, { align: "center" });
    y += 14;

    // Table
    const tableHeaders = [
      [
        "SUIT NO. AND PARTIES",
        "DATE OF JUDGMENT",
        "DATE OF EXECUTION",
        "DURATION FROM JUDGMENT TO EXECUTION",
        "STATUS OF JUDGMENTS NOT EXECUTED (WHETHER ON APPEAL)"
      ]
    ];
    const numRows = Math.max(
      type10Data.suitNoAndParties?.length || 0,
      type10Data.dateOfJudgment?.length || 0,
      type10Data.dateOfExecution?.length || 0,
      type10Data.durationFromJudgmentToExecution?.length || 0,
      type10Data.statusOfJudgmentsNotExecuted?.length || 0
    );
    const tableRows: string[][] = [];
    for (let i = 0; i < numRows; i++) {
      tableRows.push([
        type10Data.suitNoAndParties?.[i] || "",
        type10Data.dateOfJudgment?.[i] || "",
        type10Data.dateOfExecution?.[i] || "",
        type10Data.durationFromJudgmentToExecution?.[i] || "",
        type10Data.statusOfJudgmentsNotExecuted?.[i] || ""
      ]);
    }
    autoTable(docLandscape, {
      head: tableHeaders,
      body: tableRows,
      startY: y,
      theme: "grid",
      styles: {
        fontSize: 10,
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
    });
 
    // After the table, add the summary fields at the bottom
    let summaryY = (docLandscape as any).lastAutoTable?.finalY || (y + 60);
    summaryY += 12;
    docLandscape.setFontSize(12);
    docLandscape.setFont("helvetica", "normal");
    docLandscape.text(`NUMBER OF CASES EXECUTED: ${numberOfCasesExecuted}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`NUMBER OF CASES NOT EXECUTED: ${numberOfCasesNotExecuted}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`NAME OF DEPUTY SHERIFF: ${nameOfDeputySheriff}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`DATE: ${date}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`SIGNATURE: ${signature}`, marginX, summaryY);
    return docLandscape;
  } else if (formData.reportType === "type11" && cleanedFormData.type11Data) {
    // Use landscape orientation for type11
    const docLandscape = new jsPDF({ orientation: "landscape", unit: "mm" });
    const type11Data = cleanedFormData.type11Data;
    let y = 30;
    const marginX = 20;
    const pageWidth = docLandscape.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const state = (currentUserState || "XYZ").toUpperCase();
    const month = type11Data.month || "[Month]";
    const year = type11Data.year || "[Year]";
    const address = type11Data.address || "[Court Address]";
    const numberOfPendingCasesForTheMonth = type11Data.numberOfPendingCasesForTheMonth || "";
    const numberOfDisposedCasesForTheMonth = type11Data.numberOfDisposedCasesForTheMonth || "";
    const nameOfMagistrate = type11Data.nameOfMagistrate || "";
    const date = type11Data.date || "";
    const signature = type11Data.signature || "";

    // Header
    docLandscape.setFontSize(16);
    docLandscape.setFont("helvetica", "bold");
    docLandscape.text(`${state} STATE JUDICIARY`, centerX, y, { align: "center" });
    y += 10;
    docLandscape.text("SMALL CLAIMS COURT", centerX, y, { align: "center" });
    y += 10;
    docLandscape.setFontSize(13);
    docLandscape.text(`TIME TO DISPOSITION INDICATOR FOR THE MONTH OF ${month.toUpperCase()}, ${year}`, centerX, y, { align: "center" });
    y += 10;
    docLandscape.text(`SMALL CLAIMS COURT NO 1 ${address.toUpperCase()}`, centerX, y, { align: "center" });
    y += 14;

    // Table
    const tableHeaders = [
      [
        "SUIT NO. AND PARTIES",
        "DATE OF FILLING",
        "DATE OF ASSIGNMENT",
        "DATE OF SERVICE",
        "DATE OF COMMENCEMENT OF HEARING",
        "NO. OF ADJOURNMENTS",
        "REASON FOR ADJOURNMENT (WHERE MORE THAN ONCE)",
        "DATE OF JUDGMENT",
        "STAGE OF PENDING CLAIMS (WHERE JUDGEMENT HAS NOT BEEN DELIVERED)",
        "DURATION FROM FILING TILL JUDGMENT"
      ]
    ];
    const numRows = Math.max(
      type11Data.suitNoAndParties?.length || 0,
      type11Data.dateOfFiling?.length || 0,
      type11Data.dateOfAssignment?.length || 0,
      type11Data.dateOfService?.length || 0,
      type11Data.dateOfCommencementOfHearing?.length || 0,
      type11Data.numberOfAdjournments?.length || 0,
      type11Data.reasonForAdjournment?.length || 0,
      type11Data.dateOfJudgment?.length || 0,
      type11Data.stageOfPendingClaims?.length || 0,
      type11Data.durationFromFilingTillJudgment?.length || 0
    );
    const tableRows: string[][] = [];
    for (let i = 0; i < numRows; i++) {
      tableRows.push([
        type11Data.suitNoAndParties?.[i] || "",
        type11Data.dateOfFiling?.[i] || "",
        type11Data.dateOfAssignment?.[i] || "",
        type11Data.dateOfService?.[i] || "",
        type11Data.dateOfCommencementOfHearing?.[i] || "",
        type11Data.numberOfAdjournments?.[i] || "",
        type11Data.reasonForAdjournment?.[i] || "",
        type11Data.dateOfJudgment?.[i] || "",
        type11Data.stageOfPendingClaims?.[i] || "",
        type11Data.durationFromFilingTillJudgment?.[i] || ""
      ]);
    }
    autoTable(docLandscape, {
      head: tableHeaders,
      body: tableRows,
      startY: y,
      theme: "grid",
      styles: {
        fontSize: 10,
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
    });

    let summaryY = (docLandscape as any).lastAutoTable?.finalY || (y + 60);
    summaryY += 12;
    docLandscape.setFontSize(12);
    docLandscape.setFont("helvetica", "normal");
    docLandscape.text(`NO. OF PENDING CASES FOR THE MONTH: ${numberOfPendingCasesForTheMonth}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`NO. OF DISPOSED CASES FOR THE MONTH: ${numberOfDisposedCasesForTheMonth}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`NAME OF MAGISTRATE: ${nameOfMagistrate}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`DATE: ${date}`, marginX, summaryY);
    summaryY += 12;
    docLandscape.text(`SIGNATURE: ${signature}`, marginX, summaryY);
    return docLandscape;
  } 
else if (cleanedFormData.reportType === "type12" && cleanedFormData.type12Data) {
  const {
    fiveMDA = [],
    mdaRecords = [],
    backEndVerf,
  } = cleanedFormData.type12Data;

  // Initialize page settings and variables
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 25;
  const marginRight = 25;
  const maxWidth = pageWidth - marginLeft - marginRight;
  let y = 30;
  let currentPage = 1;

  // Enhanced styling functions
  const addTitle = (text: string) => {
    if (y + 25 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }
    
    // Add background rectangle for title
    doc.setFillColor(41, 128, 185); // Professional blue
    doc.rect(marginLeft - 5, y - 15, maxWidth + 10, 20, 'F');
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); // White text
    
    // Center the title
    const textWidth = doc.getTextWidth(text);
    const centerX = (pageWidth - textWidth) / 2;
    doc.text(text, centerX, y);
    y += 25;
    doc.setTextColor(0, 0, 0); // Reset to black
  };

  const addHeader = (text: string, spacing = 15) => {
    if (y + 16 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    y += spacing;
    
    // Add subtle background for headers
    doc.setFillColor(236, 240, 241); // Light gray
    doc.rect(marginLeft - 2, y - 12, maxWidth + 4, 16, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(52, 73, 94); // Dark blue-gray
    doc.text(text, marginLeft, y);
    y += 8;
    
    // Add underline
    doc.setDrawColor(52, 73, 94);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + maxWidth, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const addSubHeader = (text: string, spacing = 10) => {
    if (y + 12 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    y += spacing;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185); // Blue
    doc.text(text, marginLeft, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const addParagraph = (text: string, spacing = 6, indent = 0) => {
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    const requiredHeight = lines.length * spacing + 5;

    if (y + requiredHeight > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80); // Dark gray for better readability

    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    lines.forEach((line, index) => {
      const currentX = marginLeft + indent;
      const urls = line.match(urlRegex);
      
      if (urls) {
        let startX = currentX;
        const parts = line.split(urlRegex);

        parts.forEach((part) => {
          if (urlRegex.test(part)) {
            doc.setTextColor(41, 128, 185); // Blue for links
            doc.setFont("helvetica", "normal");
            doc.textWithLink(part, startX, y, { url: part });
            const partWidth = doc.getTextWidth(part);
            startX += partWidth;
          } else {
            doc.setTextColor(44, 62, 80);
            doc.text(part, startX, y);
            const partWidth = doc.getTextWidth(part);
            startX += partWidth;
          }
        });
      } else {
        doc.setTextColor(44, 62, 80);
        doc.text(line, currentX, y);
      }

      y += spacing;
    });

    y += 3; // Extra spacing after paragraph
    doc.setTextColor(0, 0, 0);
  };

  const addBulletPoint = (text: string, spacing = 6) => {
    const bulletText = `• ${text}`;
    addParagraph(bulletText, spacing, 5);
  };

  const addKeyValuePair = (key: string, value: string, spacing = 8) => {
    if (y + 12 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    // Add background for key-value pairs
    doc.setFillColor(249, 249, 249);
    doc.rect(marginLeft - 2, y - 3, maxWidth + 4, 12, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);
    doc.text(`${key}:`, marginLeft, y + 5);

    const keyWidth = doc.getTextWidth(`${key}: `);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(44, 62, 80);
    
    // Handle long values by wrapping
    const valueLines = doc.splitTextToSize(value || "N/A", maxWidth - keyWidth - 10);
    valueLines.forEach((line, index) => {
      doc.text(line, marginLeft + keyWidth + 5, y + 5 + (index * spacing));
    });

    y += Math.max(12, valueLines.length * spacing + 4);
    doc.setTextColor(0, 0, 0);
  };

  const addMDACard = (record: any, index: number) => {
    if (y + 50 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    // Add card background
    doc.setFillColor(252, 253, 254);
    doc.setDrawColor(189, 195, 199);
    doc.setLineWidth(0.5);
    doc.rect(marginLeft, y, maxWidth, 45, 'FD');

    y += 12;

    // MDA Header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(52, 73, 94);
    doc.text(`MDA ${index + 1}: ${record.NameOfMDA || "Unnamed MDA"}`, marginLeft + 5, y);
    y += 12;

    // Details with improved formatting
    const details = [
      { key: "Regulatory Process", value: record.titleOfRP },
      { key: "Web Link", value: record.WebLinkPI },
      { key: "SLA Reference/Timeline", value: record.slaRef },
      { key: "Publication Date", value: record.link2Sup }
    ];

    details.forEach((detail) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text(`${detail.key}:`, marginLeft + 8, y);

      const keyWidth = doc.getTextWidth(`${detail.key}: `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(44, 62, 80);
      
      const value = detail.value || "N/A";
      const valueLines = doc.splitTextToSize(value, maxWidth - keyWidth - 15);
      
      if (detail.key === "Web Link" && value !== "N/A" && value.startsWith("http")) {
        doc.setTextColor(41, 128, 185);
        doc.textWithLink(valueLines[0], marginLeft + keyWidth + 10, y, { url: value });
      } else {
        valueLines.forEach((line, lineIndex) => {
          doc.text(line, marginLeft + keyWidth + 10, y + (lineIndex * 6));
        });
      }
      
      y += Math.max(8, valueLines.length * 6);
    });

    y += 10; // Space after card
    doc.setTextColor(0, 0, 0);
  };

  const addDivider = () => {
    y += 5;
    doc.setDrawColor(189, 195, 199);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + maxWidth, y);
    y += 10;
  };

  const addNumberedList = (items: string[]) => {
    items.forEach((item, index) => {
      if (y + 10 > pageHeight - 30) {
        doc.addPage();
        currentPage++;
        y = 30;
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text(`${index + 1}.`, marginLeft, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(44, 62, 80);
      const lines = doc.splitTextToSize(item, maxWidth - 15);
      lines.forEach((line, lineIndex) => {
        doc.text(line, marginLeft + 15, y + (lineIndex * 6));
      });

      y += Math.max(8, lines.length * 6 + 2);
    });
    doc.setTextColor(0, 0, 0);
  };

  const addFooterToCurrentPage = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 140, 141);
    doc.text(`Page ${currentPage}`, pageWidth - 40, pageHeight - 15);
    doc.text("Generated on: " + new Date().toLocaleDateString(), marginLeft, pageHeight - 15);
    doc.setTextColor(0, 0, 0);
  };

  // Main document generation
  addTitle("Publication of Business Regulatory Processes"
    );


  addDivider();

  addHeader("Introduction");
  addParagraph(
    "This compliance assessment examines the publication status of business regulatory processes by designated BEE State MDAs, ensuring alignment with transparency requirements under the Disbursement Linked Indicator framework. The report encompasses verification of comprehensive information availability, including regulatory processes, associated fees, service procedures, processing timelines, and relevant administrative protocols."
  );

  addParagraph(
    "The assessment also includes verification of Executive Order issuance and implementation, mandating transparency and public accessibility of regulatory information across all designated state entities."
  );

  addDivider();

  addHeader("Regulatory Framework and Requirements");
  addSubHeader("Key Publication Standards");

  addParagraph("Each designated BEE State MDA must demonstrate compliance with the following publication requirements:");

  addBulletPoint("Comprehensive documentation of at least one core business regulatory process not covered under other DLIs");
  addBulletPoint("Exclusion of processes such as Right of Way, Certificate of Occupancy, or construction permits already covered elsewhere");
  addBulletPoint("Publication on official state website or respective MDA websites for public accessibility");
  addBulletPoint("Complete information including fees, procedures, timelines, and administrative requirements");
  addBulletPoint("Regular updates and maintenance of published information for accuracy");

  addDivider();

  if (fiveMDA.length > 0) {
    addHeader("Designated State MDAs");
    addSubHeader("Selected BEE State Entities");
    addParagraph("The following five MDAs have been selected for assessment and compliance verification:");
    
    y += 5;
    addNumberedList(fiveMDA);
    
    addParagraph(
      "These entities represent key regulatory functions within the state's business enabling environment framework and have been strategically selected to ensure comprehensive coverage of essential business processes."
    );
  } else {
    addHeader("Designated State MDAs");
    addParagraph("No MDA entities have been specified for this assessment period. Please provide the list of designated BEE State MDAs for comprehensive evaluation.");
  }

  addDivider();

  addHeader("Publication Verification Results");
  addSubHeader("Online Accessibility Assessment");

  if (mdaRecords.length === 0) {
    addParagraph(
      "No MDA publication records are currently available for verification. This may indicate that the publication process is still in progress or that data collection is incomplete. Please ensure all designated MDAs have submitted their publication documentation for comprehensive assessment."
    );
    
    addParagraph(
      "Recommended next steps include direct engagement with each MDA's IT department or communications team to verify publication status and obtain necessary documentation links."
    );
  } else {
    addParagraph(
      "The following assessment results detail the publication status and accessibility of regulatory information for each designated MDA:"
    );
    
    y += 10;

    mdaRecords.forEach((record, index) => {
      addMDACard(record, index);
    });

    addSubHeader("Publication Quality Assessment");
    addParagraph(
      "Each MDA's published information has been evaluated based on completeness, accessibility, and compliance with established transparency standards. The assessment criteria include information accuracy, website functionality, document accessibility, and adherence to prescribed formatting requirements."
    );
  }

  addDivider();

  addHeader("Compliance Analysis");
  addSubHeader("Transparency and Accountability Measures");

  addParagraph(
    "The implementation of comprehensive publication requirements demonstrates the state's commitment to:"
  );

  addBulletPoint("Enhanced business environment transparency through accessible regulatory information");
  addBulletPoint("Reduced administrative burden on businesses through clear process documentation");
  addBulletPoint("Improved regulatory predictability and business planning capabilities");
  addBulletPoint("Strengthened public trust through open government initiatives");
  addBulletPoint("Alignment with international best practices in regulatory transparency");

  if (backEndVerf && backEndVerf !== "N/A") {
    addDivider();
    addHeader("Backend Verification");
    addSubHeader("Technical Validation Process");
    
    addParagraph(
      "States are required to provide backend timestamp data to verify that publication occurred within established deadlines. This technical evidence should be collected directly from web platform administrators, IT teams of respective MDAs, or the state ICT office."
    );
    
    addKeyValuePair("Backend Verification Evidence", backEndVerf);
    
    addParagraph(
      "This technical validation ensures publication authenticity and timeline compliance, supporting the overall transparency initiative's credibility and effectiveness."
    );
  }

  addDivider();

  addHeader("Recommendations");
  addSubHeader("Enhancement Opportunities");

  addParagraph("Based on the assessment findings, the following recommendations are proposed:");

  addBulletPoint("Establish standardized publication templates across all MDAs for consistency");
  addBulletPoint("Implement regular review cycles to ensure information remains current and accurate");
  addBulletPoint("Develop user feedback mechanisms to improve information accessibility and usefulness");
  addBulletPoint("Create centralized monitoring systems for ongoing compliance verification");
  addBulletPoint("Establish backup publication channels to ensure continuous information availability");

  addDivider();

  addHeader("Conclusion");
  addParagraph(
    "The implementation of comprehensive transparency mechanisms demonstrates the state's strategic commitment to improving the business enabling environment. Public access to detailed regulatory information empowers businesses to make informed decisions, reduces administrative uncertainty, and builds sustainable trust in governmental administrative processes."
  );

  addParagraph(
    "Continued commitment to these transparency standards will further enhance the state's business climate, attract investment, and support economic development objectives while maintaining high standards of public accountability and administrative efficiency."
  );

  y += 10;
  addSubHeader("Supporting Documentation");
  addParagraph(
    "All relevant supporting materials, including website screenshots, publication timestamps, administrative correspondence, and compliance verification documents, are maintained as annexes to this comprehensive assessment report."
  );

  // Add footer to the final page
  addFooterToCurrentPage();
}
  else if (cleanedFormData.reportType === "type14" && cleanedFormData.type14Data) {
  const {
    monthlyComplianceSelect,
    infoSelect,
    reportPublishedSelect,
    monthlyComplianceMonth,
    monthlyComplianceLink,
  } = cleanedFormData.type14Data;

  // Initialize page settings and variables
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 25;
  const marginRight = 25;
  const maxWidth = pageWidth - marginLeft - marginRight;
  let y = 30;
  let currentPage = 1;

  // Enhanced styling functions
  const addTitle = (text: string) => {
    if (y + 25 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }
    
    // Add background rectangle for title
    doc.setFillColor(41, 128, 185); // Professional blue
    doc.rect(marginLeft - 5, y - 15, maxWidth + 10, 20, 'F');
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); // White text
    
    // Center the title
    const textWidth = doc.getTextWidth(text);
    const centerX = (pageWidth - textWidth) / 2;
    doc.text(text, centerX, y);
    y += 25;
    doc.setTextColor(0, 0, 0); // Reset to black
  };

  const addHeader = (text: string, spacing = 15) => {
    if (y + 16 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    y += spacing;
    
    // Add subtle background for headers
    doc.setFillColor(236, 240, 241); // Light gray
    doc.rect(marginLeft - 2, y - 12, maxWidth + 4, 16, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(52, 73, 94); // Dark blue-gray
    doc.text(text, marginLeft, y);
    y += 8;
    
    // Add underline
    doc.setDrawColor(52, 73, 94);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + maxWidth, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const addSubHeader = (text: string, spacing = 10) => {
    if (y + 12 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    y += spacing;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185); // Blue
    doc.text(text, marginLeft, y);
    y += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const addParagraph = (text: string, spacing = 6, indent = 0) => {
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    const requiredHeight = lines.length * spacing + 5;

    if (y + requiredHeight > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80); // Dark gray for better readability

    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    lines.forEach((line, index) => {
      const currentX = marginLeft + indent;
      const urls = line.match(urlRegex);
      
      if (urls) {
        let startX = currentX;
        const parts = line.split(urlRegex);

        parts.forEach((part) => {
          if (urlRegex.test(part)) {
            doc.setTextColor(41, 128, 185); // Blue for links
            doc.setFont("helvetica", "normal");
            doc.textWithLink(part, startX, y, { url: part });
            const partWidth = doc.getTextWidth(part);
            startX += partWidth;
          } else {
            doc.setTextColor(44, 62, 80);
            doc.text(part, startX, y);
            const partWidth = doc.getTextWidth(part);
            startX += partWidth;
          }
        });
      } else {
        doc.setTextColor(44, 62, 80);
        doc.text(line, currentX, y);
      }

      y += spacing;
    });

    y += 3; // Extra spacing after paragraph
    doc.setTextColor(0, 0, 0);
  };

  const addBulletPoint = (text: string, spacing = 6) => {
    const bulletText = `• ${text}`;
    addParagraph(bulletText, spacing, 5);
  };

  const addKeyValuePair = (key: string, value: string, spacing = 8) => {
    if (y + 12 > pageHeight - 30) {
      doc.addPage();
      currentPage++;
      y = 30;
    }

    // Add background for key-value pairs
    doc.setFillColor(249, 249, 249);
    doc.rect(marginLeft - 2, y - 3, maxWidth + 4, 12, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);
    doc.text(`${key}:`, marginLeft, y + 5);

    const keyWidth = doc.getTextWidth(`${key}: `);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(44, 62, 80);
    
    // Handle long values by wrapping
    const valueLines = doc.splitTextToSize(value || "N/A", maxWidth - keyWidth - 10);
    valueLines.forEach((line, index) => {
      doc.text(line, marginLeft + keyWidth + 5, y + 5 + (index * spacing));
    });

    y += Math.max(12, valueLines.length * spacing + 4);
    doc.setTextColor(0, 0, 0);
  };

  const addDivider = () => {
    y += 5;
    doc.setDrawColor(189, 195, 199);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + maxWidth, y);
    y += 10;
  };

  const addFooterToCurrentPage = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 140, 141);
    doc.text(`Page ${currentPage}`, pageWidth - 40, pageHeight - 15);
    doc.text("Generated on: " + new Date().toLocaleDateString(), marginLeft, pageHeight - 15);
    doc.setTextColor(0, 0, 0); // Reset color
  };

  // Main document generation
  addTitle("Monthly Compliance Report");
  addSubHeader("Assessment of 5 MDAs Regulatory Processes");

  addHeader("Executive Summary");
  addParagraph(
    "This comprehensive compliance report provides a systematic evaluation of regulatory adherence across five Ministry, Department, and Agency (MDA) entities. The assessment focuses on transparency, accountability, and regulatory process effectiveness in accordance with established compliance frameworks."
  );

  addDivider();

  addHeader("Introduction to Compliance Reports");
  addParagraph(
    "The Compliance Report represents a structured framework designed to systematically track organizational adherence to regulatory, legal, and internal requirements. This framework serves multiple critical functions:"
  );

  addBulletPoint("Promotes transparency and accountability in regulatory processes");
  addBulletPoint("Enables systematic risk management and mitigation strategies");
  addBulletPoint("Facilitates informed decision-making through comprehensive documentation");
  addBulletPoint("Ensures continuous monitoring of compliance-related activities");

  addDivider();

  addHeader("Key Components of Compliance Framework");
  addSubHeader("Essential Data Elements");
  
  addParagraph("A comprehensive compliance report incorporates the following critical components:");

  addBulletPoint("Basic Business Information: Entity name, registered address, contact details");
  addBulletPoint("Complainant Details: Name, contact information, and relationship to the issue");
  addBulletPoint("Grievance Documentation: Date received, detailed issue description");
  addBulletPoint("Response Tracking: Acknowledgement date, response timeline, resolution status");
  addBulletPoint("Compliance Status: Current standing and any remedial actions required");

  y += 5;
  
  addSubHeader("Data Protection Considerations");
  addParagraph(
    "Note: Sensitive business information including personal contact details are maintained confidentially and are not published publicly in accordance with data protection regulations."
  );

  addDivider();

  addHeader("Strategic Importance of Compliance Reporting");
  addBulletPoint("Legal Risk Mitigation: Helps organizations avoid regulatory penalties and maintain legal standing");
  addBulletPoint("Credibility Enhancement: Strengthens stakeholder trust and organizational reputation");
  addBulletPoint("Transparency Promotion: Ensures accountability in regulatory and operational processes");
  addBulletPoint("Sustainability Support: Enables long-term risk management and organizational resilience");

  addDivider();

  addHeader("Assessment Results");
  addSubHeader("Monthly Compliance Report Implementation");

  addKeyValuePair("MDA Monthly Compliance Report Status", monthlyComplianceSelect);
  addKeyValuePair("Required Information Elements Present", infoSelect);
  addKeyValuePair("Public Publication Status", reportPublishedSelect);
  addKeyValuePair("Assessment Period", monthlyComplianceMonth);
  
  if (monthlyComplianceLink && monthlyComplianceLink !== "N/A") {
    addKeyValuePair("Compliance Report Access Link", monthlyComplianceLink);
  }

  addDivider();

  addHeader("Recommendations and Next Steps");
  addParagraph(
    "Based on the assessment findings, the following recommendations are proposed to enhance compliance reporting effectiveness:"
  );

  addBulletPoint("Implement standardized reporting templates across all MDAs");
  addBulletPoint("Establish regular publication schedules for transparency");
  addBulletPoint("Develop comprehensive data collection protocols");
  addBulletPoint("Create stakeholder feedback mechanisms for continuous improvement");

  addDivider();

  addHeader("Conclusion");
  addParagraph(
    "This verification framework supports the structured validation of Grievance Redress Mechanism (GRM) functionality and responsiveness across the designated MDAs. The systematic approach ensures transparency, strengthens institutional trust, and fosters an inclusive grievance resolution culture that benefits both businesses and the general public."
  );

  addParagraph(
    "Moving forward, consistent implementation of these compliance reporting standards will enhance regulatory effectiveness and promote a culture of accountability within the governmental framework."
  );

  y += 10;
  addSubHeader("Supporting Documentation");
  addParagraph(
    "All relevant supporting materials including screenshots, compliance registers, Service Level Agreement documents, and publication website links are maintained as annexes to this report for comprehensive verification purposes."
  );

  // Add footer to the final page
  addFooterToCurrentPage();
}
  else {

    const headers: string[] = [];
    const allRows: any[][] = [];
    let maxRows = 1;
    let typeSpecificData: Type1Data | Type2Data | Type3Data | Type4Data | Type5Data | Type6Data | Type7Data | Type12Data | Type14Data | undefined;
    let reportTitlePrefix = " ";

    switch (cleanedFormData.reportType) {
      case "type2":
        reportTitlePrefix = `${(currentUserState || "XYZ").toUpperCase()} ANNOUNCE INVESTMENT REPORT`;
        typeSpecificData = cleanedFormData.type2Data;
        if (typeSpecificData) {
          headers.push("S.No.", "Announce Investment", "Date of Announcement", "Media Platform");
          maxRows = Math.max(maxRows, (typeSpecificData as Type2Data).announceInvestment.length);
        }
        break;
      case "type3":
        typeSpecificData = cleanedFormData.type3Data;
        reportTitlePrefix = `${(currentUserState || "XYZ").toUpperCase()} INCENTIVE INVESTMENT REPORT`;
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
      case "type4":
        typeSpecificData = cleanedFormData.type4Data;
        reportTitlePrefix = `${(currentUserState || "XYZ").toUpperCase()} STATE SCHEDULE OF TRADE-RELATED FEES COMPLIANCE REPORT`;
        if (typeSpecificData) {
          headers.push(
            "S.No.",
            "PUBLISHED DOCUMENT LINK",
            "LEGAL ACTIONS",
            "AMENDED LAW LINK",
            "VERIFICATION 1",
            "VERIFICATION 2",
            "VERIFICATION 3",
            "VERIFICATION 4",
            "VERIFICATION 5"
          );
          const type4Data = typeSpecificData as Type4Data;
          maxRows = Math.max(
            maxRows,
            type4Data.publishedDocumentLink.length,
            type4Data.legislativeActions.amendmentToRevenueCode ? 1 : 0,
            type4Data.legislativeActions.executiveOrder ? 1 : 0,
            type4Data.amendedLawLink.length,
            type4Data.verification1.confirmed ? 1 : 0,
            type4Data.verification2.confirmed ? 1 : 0,
            type4Data.verification3.confirmed ? 1 : 0,
            type4Data.verification4.confirmed ? 1 : 0,
            type4Data.verification5.confirmed ? 1 : 0
          );
        }
        break;
      case "type5":
        typeSpecificData = cleanedFormData.type5Data;
        reportTitlePrefix = "STATE COMMITTEE ON EXPORT PROMOTION (SCEP) REPORT";
        if (typeSpecificData) {
          headers.push(
            "S.No.",
            "SCEP MANDATE DOCUMENTATION LINK",
            "HAS EXPORT STRATEGY",
            "EXPORT STRATEGY DOCUMENT LINK",
            "STAKEHOLDER CONSULTATION",
            "BUDGET DOCUMENTS",
            "IMPLEMENTATION ACTIVITIES",
            "CHECKLIST"
          );
          const type5Data = typeSpecificData as Type5Data;
          maxRows = Math.max(
            maxRows,
            type5Data.scepMandateLink.length,
            type5Data.hasExportStrategy ? 1 : 0,
            type5Data.exportStrategyLink.length,
            type5Data.stakeholderConsultation.attendanceSheets.length,
            type5Data.stakeholderConsultation.meetingMinutes.length,
            type5Data.stakeholderConsultation.privateContributors.length,
            type5Data.stakeholderConsultation.feedbackSummary.length,
            type5Data.budgetDocuments.length,
            type5Data.implementationReports.length
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
              cleanedFormData.type2Data.dateOfAnnouncement[i] || "",
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
        case "type4":
          if (cleanedFormData.type4Data) {
            currentRow.push(
              i + 1,
              cleanedFormData.type4Data.publishedDocumentLink || "",
              cleanedFormData.type4Data.legislativeActions.amendmentToRevenueCode ? "Amendment to Revenue Code" : "No Amendment",
              cleanedFormData.type4Data.legislativeActions.executiveOrder ? "Executive Order" : "No Executive Order",
              cleanedFormData.type4Data.amendedLawLink || "",
              cleanedFormData.type4Data.verification1.confirmed ? "Confirmed" : "Not Confirmed",
              cleanedFormData.type4Data.verification1.evidence || "",
              cleanedFormData.type4Data.verification2.confirmed ? "Confirmed" : "Not Confirmed",
              cleanedFormData.type4Data.verification2.evidence || "",
              cleanedFormData.type4Data.verification3.confirmed ? "Confirmed" : "Not Confirmed",
              cleanedFormData.type4Data.verification3.evidence || "",
              cleanedFormData.type4Data.verification4.confirmed ? "Confirmed" : "Not Confirmed",
              cleanedFormData.type4Data.verification4.evidence || "",
              cleanedFormData.type4Data.verification5.confirmed ? "Confirmed" : "Not Confirmed",
              cleanedFormData.type4Data.verification5.evidence || ""
            );
          }
          break;
        case "type5":
          if (cleanedFormData.type5Data) {
            currentRow.push(
              i + 1,
              cleanedFormData.type5Data.scepMandateLink || "",
              cleanedFormData.type5Data.hasExportStrategy ? "Yes" : "No",
              cleanedFormData.type5Data.exportStrategyLink || "",
              cleanedFormData.type5Data.stakeholderConsultation.attendanceSheets || "",
              cleanedFormData.type5Data.stakeholderConsultation.meetingMinutes || "",
              cleanedFormData.type5Data.stakeholderConsultation.privateContributors.join(", ") || "",
              cleanedFormData.type5Data.stakeholderConsultation.feedbackSummary || "",
              cleanedFormData.type5Data.budgetDocuments || "",
              cleanedFormData.type5Data.implementationReports.join(", ") || ""
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

