import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { indicators } from "@/convex/config/indicators";

export interface StateIndicatorScore {
  state: string;
  indicator: string;
  subIndicator: string;
  value: string;
  score: number;
  createdAt: number;
}

export interface StateIndicatorData {
  state: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  subIndicatorScores: Array<{
    subIndicator: string;
    label: string;
    value: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
}

interface GenerateStateIndicatorPDFParams {
  indicatorKey: string;
  indicatorName: string;
  stateData: StateIndicatorData[];
  year?: number;
}

export async function generateStateIndicatorPDF({
  indicatorKey,
  indicatorName,
  stateData,
  year = new Date().getFullYear()
}: GenerateStateIndicatorPDFParams): Promise<void> {
  if (!stateData || stateData.length === 0) {
    toast.error("No state data available for this indicator");
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`State Performance Analysis: ${indicatorName}`, pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Comprehensive breakdown of all states' scores and sub-indicator performance`, pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 6;

    // Summary statistics
    const totalStates = stateData.length;
    const averageScore = stateData.reduce((sum, state) => sum + state.percentage, 0) / totalStates;
    const maxPossibleScore = stateData[0]?.maxScore || 0;
    const topPerformer = stateData.reduce((top, current) => 
      current.percentage > top.percentage ? current : top, stateData[0]);
    const bottomPerformer = stateData.reduce((bottom, current) => 
      current.percentage < bottom.percentage ? current : bottom, stateData[0]);

    doc.text(
      `States Analyzed: ${totalStates} | Average Performance: ${averageScore.toFixed(1)}% | Max Possible Score: ${maxPossibleScore} pts`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 5;

    doc.text(
      `Top Performer: ${topPerformer.state} (${topPerformer.percentage.toFixed(1)}%) | Bottom: ${bottomPerformer.state} (${bottomPerformer.percentage.toFixed(1)}%)`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 10;

    // Sort states by performance (highest first)
    const sortedStates = [...stateData].sort((a, b) => b.percentage - a.percentage);

    // Get sub-indicator information
    const indicatorConfig = indicators[indicatorKey as keyof typeof indicators];
    const subIndicatorKeys = Object.keys(indicatorConfig?.subIndicators || {});

    // Create main summary table
    const summaryTableData = sortedStates.map((state, index) => [
      (index + 1).toString(),
      state.state,
      state.totalScore.toFixed(1),
      `${state.percentage.toFixed(1)}%`,
      getPerformanceGrade(state.percentage)
    ]);

    autoTable(doc, {
      head: [["Rank", "State", "Total Score", "Percentage", "Grade"]],
      body: summaryTableData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 20, halign: "center" }
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Add new page for detailed breakdown
    doc.addPage();
    currentY = 20;

    // Detailed sub-indicator breakdown
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Detailed Sub-Indicator Breakdown", pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    // Create detailed table with sub-indicators
    const detailedTableHeaders = ["Rank", "State", "Total Score", ...subIndicatorKeys.map(key => {
      const config = indicatorConfig?.subIndicators[key];
      return config?.label?.substring(0, 20) + "..." || key;
    })];

    const detailedTableData = sortedStates.map((state, index) => {
      const row = [
        (index + 1).toString(),
        state.state,
        `${state.totalScore.toFixed(1)}/${state.maxScore}`
      ];

      // Add sub-indicator scores
      subIndicatorKeys.forEach(subKey => {
        const subScore = state.subIndicatorScores.find(s => s.subIndicator === subKey);
        if (subScore) {
          row.push(`${subScore.score}/${subScore.maxScore}`);
        } else {
          row.push("0/0");
        }
      });

      return row;
    });

    autoTable(doc, {
      head: [detailedTableHeaders],
      body: detailedTableData,
      startY: currentY,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 40 },
        2: { cellWidth: 25, halign: "center" }
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Add sub-indicator legend on new page if needed
    const legendY = (doc as any).lastAutoTable.finalY + 15;
    if (legendY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY = legendY;
    }

    // Sub-indicator legend
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Sub-Indicator Descriptions", 15, currentY);
    currentY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    subIndicatorKeys.forEach((subKey, index) => {
      const config = indicatorConfig?.subIndicators[subKey];
      if (config) {
        const maxScore = Math.max(...(config.options as Array<{ score: number }>).map(opt => opt.score));
        doc.text(`${index + 1}. ${config.label} (Max: ${maxScore} pts)`, 15, currentY);
        currentY += 5;

        // Show scoring options
        (config.options as Array<{ value: string; label: string; score: number }>).forEach(option => {
          doc.text(`   • ${option.label} = ${option.score} pts`, 20, currentY);
          currentY += 4;
        });
        currentY += 2;

        // Check if we need a new page
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
      }
    });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated on ${new Date().toLocaleString()} | PEBEC State Scoring System`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Save PDF
    const fileName = `State_Analysis_${indicatorName.replace(/\s+/g, '_')}_${year}.pdf`;
    doc.save(fileName);

    toast.success(`State indicator analysis PDF downloaded: ${indicatorName}`);
  } catch (error) {
    console.error("Error generating state indicator PDF:", error);
    toast.error("Failed to generate state indicator PDF");
  }
}

function getPerformanceGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

// Helper function to process raw state scores into structured data
export function processStateScoresForIndicator(
  allScores: StateIndicatorScore[],
  indicatorKey: string
): StateIndicatorData[] {
  const indicatorConfig = indicators[indicatorKey as keyof typeof indicators];
  if (!indicatorConfig) return [];

  // Calculate max score for this indicator
  const maxScore = Object.values(indicatorConfig.subIndicators).reduce((sum, subConfig: any) => {
    const maxSubScore = Math.max(...subConfig.options.map((opt: any) => opt.score));
    return sum + maxSubScore;
  }, 0);

  // Filter scores for this indicator
  const indicatorScores = allScores.filter(score => score.indicator === indicatorKey);

  // Group by state
  const stateGroups: Record<string, StateIndicatorScore[]> = {};
  indicatorScores.forEach(score => {
    if (!stateGroups[score.state]) {
      stateGroups[score.state] = [];
    }
    stateGroups[score.state].push(score);
  });

  // Process each state
  return Object.entries(stateGroups).map(([state, scores]) => {
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Process sub-indicators
    const subIndicatorScores = Object.entries(indicatorConfig.subIndicators).map(([subKey, subConfig]: [string, any]) => {
      const subScore = scores.find(s => s.subIndicator === subKey);
      const maxSubScore = Math.max(...subConfig.options.map((opt: any) => opt.score));
      const score = subScore?.score || 0;
      const subPercentage = maxSubScore > 0 ? (score / maxSubScore) * 100 : 0;

      return {
        subIndicator: subKey,
        label: subConfig.label,
        value: subScore?.value || "Not scored",
        score,
        maxScore: maxSubScore,
        percentage: subPercentage
      };
    });

    return {
      state,
      totalScore,
      maxScore,
      percentage,
      subIndicatorScores
    };
  });
}
