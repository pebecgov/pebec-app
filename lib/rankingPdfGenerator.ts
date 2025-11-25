import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export interface RankingPDFData {
  mdaName: string;
  sla: number;
  mysteryShopping: number;
  controversial: number;
  toutingRentseeking: number;
  innovation: number;
  stakeholder: number;
  transparency: number;
  reportGovResolution: number;
  monthlyReport: number;
  timeliness: number;
  baseTotalScore: number;
  totalScore: number;
  totalPercentage: number;
  isReportGovSkipped: boolean;
  isTransparencySkipped: boolean;
  maxPossiblePoints: number;
}

interface GenerateRankingPDFParams {
  data: RankingPDFData[];
  year: number;
  filter: 'all' | 'withData';
  ministryFilter: 'all' | 'without-ministries' | 'ministries-only';
  title?: string;
}

export async function generateRankingPDF({
  data,
  year,
  filter,
  ministryFilter,
  title
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

    // Title
    const pdfTitle = title || `MDA Rankings ${ministryFilter === 'without-ministries' ? '(Without Ministries)' : ministryFilter === 'ministries-only' ? '(Ministries Only)' : '(All MDAs)'}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(pdfTitle, pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Reference Year: ${year}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
    doc.text(`Filter: ${filter === 'all' ? 'All MDAs' : 'MDAs with Data Only'}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
    doc.text(`Total MDAs: ${data.length}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    // Sort data by total score (descending)
    const sortedData = [...data].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    // Prepare table data with all metrics
    const tableRows = sortedData.map((mda, index) => {
      const rank = index + 1;
      
      // Calculate penalties for display
      const controversialPenalty = mda.controversial < 0 ? Math.abs(mda.controversial) : 0;
      const toutingRentseekingPenalty = mda.toutingRentseeking < 0 ? Math.abs(mda.toutingRentseeking) : 0;
      
      return [
        rank.toString(),
        mda.mdaName,
        mda.sla.toFixed(1),
        mda.mysteryShopping.toFixed(1),
        mda.innovation.toFixed(1),
        mda.stakeholder.toFixed(1),
        mda.transparency.toFixed(1),
        mda.reportGovResolution.toFixed(1),
        mda.monthlyReport.toFixed(1),
        mda.timeliness.toFixed(1),
        mda.baseTotalScore.toFixed(1),
        controversialPenalty > 0 ? `-${controversialPenalty.toFixed(1)}` : "0.0",
        toutingRentseekingPenalty > 0 ? `-${toutingRentseekingPenalty.toFixed(1)}` : "0.0",
        mda.totalScore.toFixed(1),
        `${mda.totalPercentage.toFixed(1)}%`,
        `${mda.maxPossiblePoints.toFixed(0)}`
      ];
    });

    // Create table with all columns
    autoTable(doc, {
      head: [[
        "Rank",
        "MDA Name", 
        "SLA\n(30)",
        "Mystery\nShopping\n(20)",
        "Innovation\n(10)",
        "Stakeholder\n(10)",
        "Transparency\n(5)",
        "ReportGov\nResolution\n(15)",
        "Monthly\nReport\n(3)",
        "Timeliness\n(2)",
        "Base\nTotal",
        "Controversial\nPenalty",
        "Touting &\nRentseeking\nPenalty",
        "Final\nTotal",
        "Percentage",
        "Max\nPoints"
      ]],
      body: tableRows,
      startY: currentY,
      styles: { 
        fontSize: 7, 
        cellPadding: 1.5,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: { 
        fillColor: [15, 76, 129], 
        halign: "center",
        fontSize: 7,
        cellPadding: 1.5
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" }, // Rank
        1: { cellWidth: 35, halign: "left" },   // MDA Name
        2: { cellWidth: 12, halign: "center" }, // SLA
        3: { cellWidth: 12, halign: "center" }, // Mystery Shopping
        4: { cellWidth: 12, halign: "center" }, // Innovation
        5: { cellWidth: 12, halign: "center" }, // Stakeholder
        6: { cellWidth: 12, halign: "center" }, // Transparency
        7: { cellWidth: 12, halign: "center" }, // ReportGov
        8: { cellWidth: 12, halign: "center" }, // Monthly Report
        9: { cellWidth: 12, halign: "center" }, // Timeliness
        10: { cellWidth: 12, halign: "center" }, // Base Total
        11: { cellWidth: 12, halign: "center" }, // Controversial Penalty
        12: { cellWidth: 12, halign: "center" }, // Touting & Rentseeking Penalty
        13: { cellWidth: 12, halign: "center" }, // Final Total
        14: { cellWidth: 15, halign: "center" }, // Percentage
        15: { cellWidth: 12, halign: "center" }  // Max Points
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 }
    });

    // Add summary statistics
    let summaryY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page for summary
    if (summaryY > 180) {
      doc.addPage();
      summaryY = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary Statistics", 15, summaryY);
    summaryY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const totalMdas = sortedData.length;
    const averageScore = totalMdas > 0 ? sortedData.reduce((sum, mda) => sum + (mda.totalScore || 0), 0) / totalMdas : 0;
    const averagePercentage = totalMdas > 0 ? sortedData.reduce((sum, mda) => sum + (mda.totalPercentage || 0), 0) / totalMdas : 0;
    const topScore = sortedData.length > 0 ? sortedData[0].totalScore : 0;
    const bottomScore = sortedData.length > 0 ? sortedData[sortedData.length - 1].totalScore : 0;

    const summaryStats = [
      `Total MDAs: ${totalMdas}`,
      `Average Score: ${averageScore.toFixed(2)} points`,
      `Average Percentage: ${averagePercentage.toFixed(1)}%`,
      `Highest Score: ${topScore.toFixed(1)} points`,
      `Lowest Score: ${bottomScore.toFixed(1)} points`
    ];

    summaryStats.forEach((stat, index) => {
      doc.text(stat, 15, summaryY + (index * 6));
    });

    // Add footer with generation info
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    // Generate filename based on ministry filter
    let filename = `MDA_Rankings_${year}`;
    if (ministryFilter === 'without-ministries') {
      filename += '_Without_Ministries';
    } else if (ministryFilter === 'ministries-only') {
      filename += '_Ministries_Only';
    }
    filename += '.pdf';

    doc.save(filename);
    toast.success(`${pdfTitle} PDF downloaded successfully`);
  } catch (error) {
    console.error("Error generating ranking PDF:", error);
    toast.error("Failed to generate ranking PDF");
  }
}
