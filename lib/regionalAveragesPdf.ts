import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export interface RegionalAverageRow {
  region: string;
  averageScore: number;
  averagePercentage: number;
  states: string[];
  statesWithData: number;
  totalScore: number;
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
    const tableRows = data.map((row) => [
      row.region,
      `${row.averageScore.toFixed(1)} / ${overallMaxScore.toFixed(1)}`,
      `${row.averagePercentage.toFixed(1)}%`,
      `${row.statesWithData}/${row.states.length}`,
      row.states.join(", "),
    ]);

    autoTable(doc, {
      head: [["Region", "Avg Score", "Avg Percentage", "States w/ Data", "States Covered"]],
      body: tableRows,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 76, 129], halign: "center" },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 32, halign: "center" },
        4: { cellWidth: 70 },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || currentY;

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "*States without submitted scores count as zero in the regional average. 'States w/ Data' shows how many states currently have records.",
      pageWidth / 2,
      finalY + 8,
      { align: "center" },
    );

    doc.save(`Regional_Averages_${year}.pdf`);
    toast.success("Regional averages PDF downloaded");
  } catch (error) {
    console.error("Error generating regional averages PDF:", error);
    toast.error("Failed to generate regional averages PDF");
  }
}

