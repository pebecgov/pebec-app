import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface ScorecardPdfRow {
  rank: number;
  mdaName: string;
  source: string;
  totalTickets: number;
  resolvedTickets: number;
  scorePercentage: number | null;
}

interface GenerateScorecardPdfParams {
  rows: ScorecardPdfRow[];
  scoringPeriod: string;
}

export async function generateScorecardPdf({
  rows,
  scoringPeriod,
}: GenerateScorecardPdfParams) {
  if (!rows || rows.length === 0) {
    toast.error("No scorecard data available to download");
    return;
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MDA Report Gov", pageWidth / 2, 20, { align: "center" });


  const tableBody = rows.map((row) => [
    `#${row.rank}`,
    row.mdaName,
    row.totalTickets > 0 ? row.totalTickets.toLocaleString() : "—",
    row.resolvedTickets > 0 ? row.resolvedTickets.toLocaleString() : "—",
    row.scorePercentage !== null ? `${row.scorePercentage.toFixed(2)}%` : "—",
  ]);

  autoTable(doc, {
    startY: 40,
    head: [
      ["Rank", "MDA Name", "Total Tickets", "Resolved Tickets", "Score %"],
    ],
    body: tableBody,
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [34, 197, 94],
    },
  });

  doc.save(`mda-scorecard-${scoringPeriod.replace(/\s+/g, "-")}.pdf`);
  toast.success("Scorecard PDF generated");
}

