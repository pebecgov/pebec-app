import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

// List of ministries identified from the MDA list
export const ministries = [
  "Federal Ministry of Aviation and Aerospace Development",
  "Federal Ministry of Environment", 
  "Federal Ministry of Finance",
  "Ministry of Foreign Affairs",
  "Federal Ministry of Information and National Orientation",
  "Ministry of Interior",
  "Federal Ministry of Justice",
  "Federal Ministry of Power",
  "Federal Ministry of Transportation", 
  "Federal Ministry of Works",
  "Ministry of Budget and Economic Planning"
];

export interface MDAWithScore {
  mdaName: string;
  currentScore: number;
  grade: string;
  status: string;
  isMinistry: boolean;
  originalRank?: number;
  newRank?: number;
  rankChange?: number;
}

export interface RankingAnalysis {
  originalRankings: MDAWithScore[];
  rankingsWithoutMinistries: MDAWithScore[];
  ministriesRemoved: MDAWithScore[];
  totalMDAs: number;
  totalMinistries: number;
  averageScoreChange: number;
  significantChanges: MDAWithScore[];
}

export function isMinistry(mdaName: string): boolean {
  return ministries.some(ministry => 
    mdaName.toLowerCase().includes(ministry.toLowerCase()) ||
    ministry.toLowerCase().includes(mdaName.toLowerCase())
  );
}

export function analyzeMinistryImpact(mdaData: any[]): RankingAnalysis {
  // Create original rankings with ministry flags
  const originalRankings: MDAWithScore[] = mdaData
    .map((mda, index) => ({
      mdaName: mda.mdaName,
      currentScore: mda.currentScore || 0,
      grade: mda.grade || "F",
      status: mda.status || "Non-Compliant",
      isMinistry: isMinistry(mda.mdaName),
      originalRank: index + 1
    }))
    .sort((a, b) => b.currentScore - a.currentScore);

  // Filter out ministries and create new rankings
  const nonMinistryMDAs = originalRankings.filter(mda => !mda.isMinistry);
  const rankingsWithoutMinistries: MDAWithScore[] = nonMinistryMDAs
    .map((mda, index) => ({
      ...mda,
      newRank: index + 1,
      rankChange: (mda.originalRank || 0) - (index + 1)
    }));

  // Get removed ministries
  const ministriesRemoved = originalRankings.filter(mda => mda.isMinistry);

  // Calculate average score change
  const totalScoreChange = rankingsWithoutMinistries.reduce((sum, mda) => 
    sum + Math.abs(mda.rankChange || 0), 0);
  const averageScoreChange = rankingsWithoutMinistries.length > 0 
    ? totalScoreChange / rankingsWithoutMinistries.length 
    : 0;

  // Find significant changes (moved up/down by more than 5 positions)
  const significantChanges = rankingsWithoutMinistries.filter(mda => 
    Math.abs(mda.rankChange || 0) >= 5
  );

  return {
    originalRankings,
    rankingsWithoutMinistries,
    ministriesRemoved,
    totalMDAs: originalRankings.length,
    totalMinistries: ministriesRemoved.length,
    averageScoreChange,
    significantChanges
  };
}

export async function generateMinistryImpactPDF(analysis: RankingAnalysis, year: number): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm", 
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 25;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MDA Ranking Analysis: Impact of Removing Ministries", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Reference Year: ${year}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    // Summary Statistics
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Summary", 20, currentY);
    currentY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`• Total MDAs: ${analysis.totalMDAs}`, 25, currentY);
    currentY += 5;
    doc.text(`• Ministries Removed: ${analysis.totalMinistries}`, 25, currentY);
    currentY += 5;
    doc.text(`• Remaining MDAs: ${analysis.rankingsWithoutMinistries.length}`, 25, currentY);
    currentY += 5;
    doc.text(`• Average Rank Change: ${analysis.averageScoreChange.toFixed(1)} positions`, 25, currentY);
    currentY += 5;
    doc.text(`• Significant Changes (≥5 positions): ${analysis.significantChanges.length} MDAs`, 25, currentY);
    currentY += 10;

    // Ministries Removed Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Ministries Removed from Rankings", 20, currentY);
    currentY += 5;

    const ministriesTableData = analysis.ministriesRemoved.map(ministry => [
      ministry.originalRank?.toString() || "-",
      ministry.mdaName,
      ministry.currentScore.toFixed(1),
      ministry.grade,
      ministry.status
    ]);

    autoTable(doc, {
      head: [["Original Rank", "Ministry Name", "Score", "Grade", "Status"]],
      body: ministriesTableData,
      startY: currentY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: 80 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 25, halign: "center" }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Significant Changes Table
    if (analysis.significantChanges.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Significant Ranking Changes (≥5 positions)", 20, currentY);
      currentY += 5;

      const changesTableData = analysis.significantChanges.map(mda => [
        mda.originalRank?.toString() || "-",
        mda.newRank?.toString() || "-",
        mda.rankChange && mda.rankChange > 0 ? `+${mda.rankChange}` : mda.rankChange?.toString() || "0",
        mda.mdaName,
        mda.currentScore.toFixed(1)
      ]);

      autoTable(doc, {
        head: [["Original Rank", "New Rank", "Change", "MDA Name", "Score"]],
        body: changesTableData,
        startY: currentY,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [40, 167, 69], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 80 },
          4: { cellWidth: 20, halign: "center" }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Add new page for full comparison if needed
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }

    // Top 20 Comparison Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top 20 Rankings Comparison", 20, currentY);
    currentY += 5;

    const top20Original = analysis.originalRankings.slice(0, 20);
    const top20New = analysis.rankingsWithoutMinistries.slice(0, 20);

    const comparisonData = [];
    for (let i = 0; i < 20; i++) {
      const original = top20Original[i];
      const newRank = top20New[i];
      
      comparisonData.push([
        (i + 1).toString(),
        original ? original.mdaName : "-",
        original ? original.currentScore.toFixed(1) : "-",
        (i + 1).toString(),
        newRank ? newRank.mdaName : "-",
        newRank ? newRank.currentScore.toFixed(1) : "-"
      ]);
    }

    autoTable(doc, {
      head: [["Rank", "Original Top 20", "Score", "Rank", "Without Ministries", "Score"]],
      body: comparisonData,
      startY: currentY,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [23, 162, 184], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 60 },
        5: { cellWidth: 15, halign: "center" }
      },
    });

    doc.save(`MDA_Ministry_Impact_Analysis_${year}.pdf`);
    toast.success("Ministry impact analysis PDF downloaded");
  } catch (error) {
    console.error("Error generating ministry impact PDF:", error);
    toast.error("Failed to generate ministry impact analysis PDF");
  }
}
