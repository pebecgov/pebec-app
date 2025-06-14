
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// You may need to update this import path if yearsToShow is defined elsewhere
const currentYear = new Date().getFullYear();
const yearsToShow = [currentYear - 3, currentYear - 2, currentYear - 1];

import type { FormData, Type1Data, Type2Data, Type3Data, Type4Data, Type5Data, Type6Data } from "./page";

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
    doc.text(`${currentUserState} State's Investor Aftercare and Retention Program`, marginX, y);
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
    doc.text(`${currentUserState} State Schedule of Trade-Related Fees Compliance Report`, marginX, y);
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
    doc.text(`${currentUserState} State Committee on Export Promotion (SCEP) Report`, marginX, y);
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
    doc.text(`${currentUserState} Grievance Redress Mechanism (GRM) Report`, marginX, y);
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
  } else {
    // Type 2 and Type 3 table generation (same as original)
    const headers: string[] = [];
    const allRows: any[][] = [];
    let maxRows = 1;
    let typeSpecificData: Type1Data | Type2Data | Type3Data | Type4Data | Type5Data | Type6Data | undefined;
    let reportTitlePrefix = "Saber Agent Report";

    switch (cleanedFormData.reportType) {
      case "type2":
        reportTitlePrefix = `${currentUserState} ANNOUNCE INVESTMENT REPORT`;
        typeSpecificData = cleanedFormData.type2Data;
        if (typeSpecificData) {
          headers.push("S.No.", "Announce Investment", "Date of Announcement", "Media Platform");
          maxRows = Math.max(maxRows, (typeSpecificData as Type2Data).announceInvestment.length);
        }
        break;
      case "type3":
        typeSpecificData = cleanedFormData.type3Data;
        reportTitlePrefix = `${currentUserState} INCENTIVE INVESTMENT REPORT`;
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
        reportTitlePrefix = `${currentUserState} STATE SCHEDULE OF TRADE-RELATED FEES COMPLIANCE REPORT`;
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
              cleanedFormData.type2Data.dateOfAnnouncement[i] || "" ,
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

