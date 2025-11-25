import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { isMinistry } from "./ministryAnalysis";

export interface MDADataForPDF {
  mdaName: string;
  totalScore: number;
  totalPercentage: number;
  grade: string;
  status: string;
  sla?: { score: number; percentage: number };
  mysteryShopping?: { score: number; percentage: number };
  controversial?: { score: number };
  innovation?: { score: number; percentage: number };
  stakeholder?: { score: number; percentage: number };
  transparency?: { score: number; percentage: number };
  reportGovResolution?: { score: number; percentage: number };
  monthlyReport?: { score: number; percentage: number };
  timeliness?: { score: number; percentage: number };
  maxPossiblePoints?: number;
}

interface GenerateRankingPDFParams {
  data: MDADataForPDF[];
  year: number;
  rankingType: 'all' | 'without-ministries' | 'ministries-only';
  selectedMetric?: string;
}

export async function generateRankingPDF({
  data,
  year,
  rankingType,
  selectedMetric = 'totalScore'
}: GenerateRankingPDFParams): Promise<void> {
  if (!data || data.length === 0) {
    toast.error("No data available to download");
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // Title based on ranking type
    const titles = {
      'all': 'Complete MDA Rankings',
      'without-ministries': 'MDA Rankings (Excluding Ministries)',
      'ministries-only': 'Ministry Rankings Only'
    };

    const descriptions = {
      'all': 'All 70 MDAs ranked by performance scores',
      'without-ministries': 'Agencies, Departments & Commissions (Ministries excluded)',
      'ministries-only': 'Federal Ministries performance ranking'
    };

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(titles[rankingType], pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${descriptions[rankingType]} - Year: ${year}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;

    // Summary statistics
    const totalMDAs = data.length;
    const compliantMDAs = data.filter(mda => mda.status === "Compliant").length;
    const averageScore = data.reduce((sum, mda) => sum + mda.totalPercentage, 0) / totalMDAs;

    doc.text(
      `Total MDAs: ${totalMDAs} | Compliant: ${compliantMDAs} (${((compliantMDAs/totalMDAs)*100).toFixed(1)}%) | Average Score: ${averageScore.toFixed(1)}%`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 10;

    // Sort data by selected metric
    const sortedData = [...data].sort((a, b) => {
      if (selectedMetric === 'totalScore' || selectedMetric === 'totalPercentage') {
        return b.totalPercentage - a.totalPercentage;
      }
      // Add other metric sorting logic if needed
      return b.totalPercentage - a.totalPercentage;
    });

    // Create table data
    const tableData = sortedData.map((mda, index) => {
      const rank = index + 1;
      const isMin = isMinistry(mda.mdaName);
      
      return [
        rank.toString(),
        mda.mdaName + (isMin ? " (M)" : ""),
        mda.totalScore.toFixed(1),
        `${mda.totalPercentage.toFixed(1)}%`,
        mda.grade,
        mda.status,
        mda.sla?.score.toFixed(1) || "0.0",
        mda.mysteryShopping?.score.toFixed(1) || "0.0",
        mda.innovation?.score.toFixed(1) || "0.0",
        mda.stakeholder?.score.toFixed(1) || "0.0",
        mda.transparency?.score.toFixed(1) || "0.0"
      ];
    });

    // Generate table
    autoTable(doc, {
      head: [["Rank", "MDA Name", "Score", "Percentage", "Grade", "Status", "SLA", "Mystery", "Innovation", "Stakeholder", "Transparency"]],
      body: tableData,
      startY: currentY,
      styles: { 
        fontSize: 7, 
        cellPadding: 1.5,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: rankingType === 'all' ? [52, 152, 219] : 
                   rankingType === 'without-ministries' ? [46, 204, 113] : [155, 89, 182],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 80 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 25, halign: "center" },
        6: { cellWidth: 18, halign: "center" },
        7: { cellWidth: 18, halign: "center" },
        8: { cellWidth: 18, halign: "center" },
        9: { cellWidth: 18, halign: "center" },
        10: { cellWidth: 18, halign: "center" }
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 }
    });

    // Add legend if showing all MDAs
    if (rankingType === 'all') {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("(M) = Ministry", 15, finalY);
    }

    // Add footer with generation timestamp
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated on ${new Date().toLocaleString()} | PEBEC MDA Scoring System`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Save with appropriate filename
    const fileNames = {
      'all': `Complete_MDA_Rankings_${year}.pdf`,
      'without-ministries': `MDA_Rankings_Without_Ministries_${year}.pdf`,
      'ministries-only': `Ministry_Rankings_${year}.pdf`
    };

    doc.save(fileNames[rankingType]);

    const successMessages = {
      'all': "Complete MDA rankings PDF downloaded",
      'without-ministries': "MDA rankings (without ministries) PDF downloaded", 
      'ministries-only': "Ministry rankings PDF downloaded"
    };

    toast.success(successMessages[rankingType]);
  } catch (error) {
    console.error("Error generating ranking PDF:", error);
    toast.error("Failed to generate ranking PDF");
  }
}

// Helper function to get ranking statistics
export function getRankingStats(data: MDADataForPDF[], rankingType: 'all' | 'without-ministries' | 'ministries-only') {
  const total = data.length;
  const compliant = data.filter(mda => mda.status === "Compliant").length;
  const averageScore = data.reduce((sum, mda) => sum + mda.totalPercentage, 0) / total;
  
  const ministries = data.filter(mda => isMinistry(mda.mdaName)).length;
  const nonMinistries = total - ministries;

  return {
    total,
    compliant,
    compliantPercentage: (compliant / total) * 100,
    averageScore,
    ministries,
    nonMinistries,
    topPerformer: data.reduce((top, current) => 
      current.totalPercentage > top.totalPercentage ? current : top, data[0]),
    bottomPerformer: data.reduce((bottom, current) => 
      current.totalPercentage < bottom.totalPercentage ? current : bottom, data[0])
  };
}
