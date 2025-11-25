import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export interface RegionalAverageRow {
  region: string;
  averageScore: number;
  averagePercentage: number;
  totalScore: number;
  statesDetailed: Array<{
    state: string;
    score: number;
    percentage: number;
    hasData: boolean;
  }>;
}

interface GenerateRegionalAveragesPDFParams {
  data: RegionalAverageRow[];
  year: number;
  overallMaxScore: number;
}

export async function generateRegionalAveragesPDF({
  data,
  year,
  overallMaxScore,
}: GenerateRegionalAveragesPDFParams): Promise<void> {
  if (!data || data.length === 0) {
    toast.error("No regional data available to download");
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 25;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Regional Average Scores by Geopolitical Zone", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Reference Year: ${year}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
    doc.text(
      `Each region's score represents the average across its states (max score: ${overallMaxScore.toFixed(
        1,
      )} pts per state).`,
      pageWidth / 2,
      currentY,
      { align: "center" },
    );
    currentY += 10;

    const nationalAverageScore =
      data.reduce((sum, item) => sum + item.averageScore, 0) / data.length;
    const nationalAveragePercentage =
      overallMaxScore > 0 ? (nationalAverageScore / overallMaxScore) * 100 : 0;

    doc.setFont("helvetica", "bold");
    doc.text(
      `National Regional Average: ${nationalAverageScore.toFixed(2)} pts (${nationalAveragePercentage.toFixed(
        1,
      )}%)`,
      pageWidth / 2,
      currentY,
      { align: "center" },
    );
    currentY += 8;

    // Build table
    const tableRows = data.map((row) => {
      const statesWithData = row.statesDetailed.filter((s) => s.hasData).length;
      const statesList = row.statesDetailed
        .map((state) => `${state.state}: ${state.score.toFixed(1)} pts`)
        .join("\n");
      return [
        row.region,
        `${row.totalScore.toFixed(1)} ÷ ${row.statesDetailed.length}`,
        `${row.averageScore.toFixed(1)} / ${overallMaxScore.toFixed(1)}`,
        `${row.averagePercentage.toFixed(1)}%`,
        `${statesWithData}/${row.statesDetailed.length}`,
        statesList,
      ];
    });

    autoTable(doc, {
      head: [
        ["Region", "Σ Score ÷ States", "Avg Score", "Avg Percentage", "States w/ Data", "State Scores (pts)"],
      ],
      body: tableRows,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 76, 129], halign: "center" },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 32, halign: "center" },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: 28, halign: "center" },
        5: { cellWidth: 50 },
      },
    });

    let detailY = (doc as any).lastAutoTable?.finalY || currentY;
    detailY += 12;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Per-Region Breakdown", pageWidth / 2, detailY, { align: "center" });
    detailY += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Average = Sum of state scores ÷ number of states in the region. States without data count as 0.",
      pageWidth / 2,
      detailY,
      { align: "center" },
    );
    detailY += 10;

    data.forEach((row, index) => {
      if (detailY > pageHeight - 20 || index === 0) {
        if (detailY > pageHeight - 20) {
          doc.addPage();
          detailY = 20;
        }
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${row.region}`, pageWidth / 2, detailY, { align: "center" });
      detailY += 5;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Average = ${row.totalScore.toFixed(1)} ÷ ${row.statesDetailed.length} = ${row.averageScore.toFixed(
          2,
        )} pts (${row.averagePercentage.toFixed(1)}%)`,
        pageWidth / 2,
        detailY,
        { align: "center" },
      );
      detailY += 6;

      autoTable(doc, {
        head: [["State", "Score (pts)", "Percentage", "Has Data?"]],
        body: row.statesDetailed.map((state) => [
          state.state,
          state.score.toFixed(1),
          `${state.percentage.toFixed(1)}%`,
          state.hasData ? "Yes" : "No (counts as 0)",
        ]),
        startY: detailY,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], halign: "center" },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 30, halign: "center" },
          3: { cellWidth: 50, halign: "center" },
        },
      });

      detailY = (doc as any).lastAutoTable.finalY + 10;
      if (detailY > pageHeight - 20 && index !== data.length - 1) {
        doc.addPage();
        detailY = 20;
      }
    });

    doc.save(`Regional_Averages_${year}.pdf`);
    toast.success("Regional averages PDF downloaded");
  } catch (error) {
    console.error("Error generating regional averages PDF:", error);
    toast.error("Failed to generate regional averages PDF");
  }
}

