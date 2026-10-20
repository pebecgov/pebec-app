import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface MdaList {
  name: string;
}

interface GenerateDashboardPDFParams {
  liveDashboardData: any[];
  selectedMetric: string;
  dashboardYear: number;
  mdasList: MdaList[];
  filterType?: "all" | "withData";
  othersConfig?: Array<{ itemId: string; itemName: string; weight: number }>;
  penaltyConfig?: Array<{ penaltyId: string; penaltyName: string; penaltyValue: number }>;
  bonusConfig?: Array<{ bonusId: string; bonusName: string; bonusValue: number }>;
  efficiencyConfig?: {
    slaPoints?: number;
    reportGovPoints?: number;
    reportSubmissionPoints?: number;
    timelinessPoints?: number;
  };
}

function metricSortValue(mda: any, selectedMetric: string): number {
  if (selectedMetric === "totalScore") return Number(mda.totalPercentage) || 0;
  if (selectedMetric === "mysteryShopping") return Number(mda.mysteryShopping?.score) || 0;
  if (selectedMetric === "sla") return Number(mda.sla?.score) || 0;
  if (selectedMetric === "controversial") return Number(mda.controversial?.score) || 0;
  if (selectedMetric === "toutingRentseeking") return Number(mda.toutingRentseeking?.score) || 0;
  if (selectedMetric === "innovation") return Number(mda.innovation?.score) || 0;
  if (selectedMetric === "stakeholder") return Number(mda.stakeholder?.score) || 0;
  if (selectedMetric === "transparency") return Number(mda.transparency?.score) || 0;
  if (selectedMetric === "reportGovResolution") return Number(mda.reportGovResolution?.score) || 0;
  if (selectedMetric === "monthlyReport") return Number(mda.monthlyReport?.score) || 0;
  if (selectedMetric === "timeliness") return Number(mda.timeliness?.score) || 0;
  if (selectedMetric === "efficiency") {
    return (
      (Number(mda.sla?.score) || 0) +
      (Number(mda.monthlyReport?.score) || 0) +
      (Number(mda.timeliness?.score) || 0)
    );
  }
  if (selectedMetric === "penalties") return Math.abs(Number(mda.penalties?.score) || 0);
  if (selectedMetric === "bonuses") return Math.abs(Number(mda.bonuses?.score) || 0);
  if (selectedMetric.startsWith("others:")) {
    const itemId = selectedMetric.replace("others:", "");
    return Number(mda.others?.scores?.[itemId]) || 0;
  }
  return Number(mda.totalPercentage) || 0;
}

function cellScore(score: number | undefined | null, max: number, skipped = false): string {
  if (skipped) return `0/${max}\n(Skipped)`;
  if (score == null || !Number.isFinite(score)) return "—";
  return `${Number(score).toFixed(1)}/${max}`;
}

/**
 * Dashboard PDF uses the same totals already computed for the ranking table
 * (processDashboardMdaData). Do not recompute with legacy 90-point rules.
 */
export async function generateDashboardPDF({
  liveDashboardData,
  selectedMetric,
  dashboardYear,
  filterType = "all",
  othersConfig = [],
  penaltyConfig = [],
  bonusConfig = [],
  efficiencyConfig,
}: GenerateDashboardPDFParams): Promise<void> {
  if (!liveDashboardData || !Array.isArray(liveDashboardData) || liveDashboardData.length === 0) {
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
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 30;

    try {
      const logoUrl = "/images/logo/logo_pebec1.PNG";
      const img = new Image();
      img.src = logoUrl;
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(() => reject(new Error("Logo load timeout")), 5000);
      });
      const logoWidth = 60;
      const logoHeight = 18;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(img, "PNG", logoX, 10, logoWidth, logoHeight);
      yPosition = 40;
    } catch {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("PEBEC", pageWidth / 2, 20, { align: "center" });
      yPosition = 35;
    }

    const metricNames: Record<string, string> = {
      totalScore: "Total Score (All Metrics)",
      mysteryShopping: "Mystery Shopping",
      sla: "Service Level Agreement",
      efficiency: "Efficiency",
      controversial: "Controversial",
      toutingRentseeking: "Touting & Rentseeking",
      innovation: "Innovation",
      stakeholder: "Stakeholder Engagement",
      transparency: "Transparency",
      reportGovResolution: "Report Gov Resolution",
      monthlyReport: "Monthly Report Submission",
      timeliness: "Timeliness",
      penalties: "Penalties",
      bonuses: "Bonuses",
    };
    const metricDisplayName =
      metricNames[selectedMetric] ||
      (selectedMetric.startsWith("others:")
        ? othersConfig.find((item) => `others:${item.itemId}` === selectedMetric)?.itemName ||
          selectedMetric
        : selectedMetric);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Live Scoring Dashboard - ${metricDisplayName}`, pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Year: ${dashboardYear}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 5;
    if (filterType === "withData") {
      doc.setFontSize(10);
      doc.text("Filter: MDAs with Data", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 5;
    }
    yPosition += 8;

    // Ranking-table totals are already on each row — keep them.
    const allMdasArray = liveDashboardData.map((mda: any) => ({
      ...mda,
      baseTotalScore: Number(mda.totalGrossScore ?? mda.baseTotalScore ?? mda.totalScore) || 0,
      totalScore: Number(mda.totalScore) || 0,
      totalPercentage: Number(mda.totalPercentage) || 0,
      maxPossiblePoints: Number(mda.maxPossiblePoints) || (dashboardYear >= 2026 ? 100 : 90),
    }));

    const sortedData = [...allMdasArray].sort(
      (a, b) => metricSortValue(b, selectedMetric) - metricSortValue(a, selectedMetric)
    );

    const slaMax = efficiencyConfig?.slaPoints || (dashboardYear >= 2026 ? 5 : 30);
    const reportGovMax = efficiencyConfig?.reportGovPoints || (dashboardYear >= 2026 ? 20 : 15);
    const monthlyMax =
      efficiencyConfig?.reportSubmissionPoints || (dashboardYear >= 2026 ? 2 : 3);
    const timelinessMax = efficiencyConfig?.timelinessPoints || (dashboardYear >= 2026 ? 3 : 2);

    const tableData: string[][] = [];
    let head: string[] = [];

    if (selectedMetric === "totalScore" && dashboardYear >= 2026) {
      head = [
        "Rank",
        "MDA Name",
        "SLA",
        "Mystery",
        "Others",
        "Report Gov",
        "Report Sub",
        "Timeliness",
        "Gross",
        "Penalties",
        "Bonuses",
        "Final",
        "Max",
        "%",
      ];
      sortedData.forEach((mda, idx) => {
        const mysteryMax = Number(mda.mysteryShopping?.maxPossibleScore) || 40;
        tableData.push([
          `#${idx + 1}`,
          mda.mdaName,
          cellScore(mda.sla?.score, Number(mda.sla?.maxPossibleScore) || slaMax),
          cellScore(mda.mysteryShopping?.score, mysteryMax),
          mda.others?.score != null ? Number(mda.others.score).toFixed(1) : "—",
          cellScore(
            mda.reportGovResolution?.score,
            Number(mda.reportGovResolution?.maxPossibleScore) || reportGovMax,
            !!mda.reportGovResolution?.isSkipped
          ),
          cellScore(
            mda.monthlyReport?.score,
            Number(mda.monthlyReport?.maxPossibleScore) || monthlyMax
          ),
          cellScore(
            mda.timeliness?.score,
            Number(mda.timeliness?.maxPossibleScore) || timelinessMax
          ),
          Number(mda.baseTotalScore || 0).toFixed(1),
          Math.abs(Number(mda.penalties?.score) || 0).toFixed(1),
          Math.abs(Number(mda.bonuses?.score) || 0).toFixed(1),
          Number(mda.totalScore || 0).toFixed(1),
          String(mda.maxPossiblePoints),
          `${Number(mda.totalPercentage || 0).toFixed(1)}%`,
        ]);
      });
    } else if (selectedMetric === "totalScore") {
      head = [
        "Rank",
        "MDA Name",
        "SLA",
        "Mystery",
        "Innovation",
        "Stakeholder",
        "Transparency",
        "Report Gov",
        "Report Sub",
        "Timeliness",
        "Gross",
        "Controversial",
        "Touting",
        "Final",
      ];
      sortedData.forEach((mda, idx) => {
        tableData.push([
          `#${idx + 1}`,
          mda.mdaName,
          cellScore(mda.sla?.score, Number(mda.sla?.maxPossibleScore) || 30),
          cellScore(mda.mysteryShopping?.score, Number(mda.mysteryShopping?.maxPossibleScore) || 20),
          cellScore(mda.innovation?.score, 5),
          cellScore(mda.stakeholder?.score, 10),
          cellScore(mda.transparency?.score, 5, !!mda.transparency?.isSkipped),
          cellScore(
            mda.reportGovResolution?.score,
            Number(mda.reportGovResolution?.maxPossibleScore) || 15,
            !!mda.reportGovResolution?.isSkipped
          ),
          cellScore(mda.monthlyReport?.score, Number(mda.monthlyReport?.maxPossibleScore) || 3),
          cellScore(mda.timeliness?.score, Number(mda.timeliness?.maxPossibleScore) || 2),
          `${Number(mda.baseTotalScore || 0).toFixed(1)}/${mda.maxPossiblePoints}`,
          (Number(mda.controversial?.score) || 0).toFixed(1),
          (Number(mda.toutingRentseeking?.score) || 0).toFixed(1),
          `${Number(mda.totalScore || 0).toFixed(1)}\n(${Number(mda.totalPercentage || 0).toFixed(1)}%)`,
        ]);
      });
    } else {
      head = ["Rank", "MDA Name", `${metricDisplayName}`];
      sortedData.forEach((mda, idx) => {
        const value = metricSortValue(mda, selectedMetric);
        tableData.push([
          `#${idx + 1}`,
          mda.mdaName,
          Number.isFinite(value) ? value.toFixed(2) : "—",
        ]);
      });
    }

    autoTable(doc, {
      startY: yPosition,
      head: [head],
      body: tableData,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: selectedMetric === "totalScore" ? 7 : 9,
      },
      bodyStyles: { fontSize: selectedMetric === "totalScore" ? 6.5 : 9 },
      styles: { fontSize: selectedMetric === "totalScore" ? 6.5 : 9, cellPadding: 1.5 },
      theme: "striped",
      margin: { left: 8, right: 8 },
      didDrawPage: (data: any) => {
        doc.setFontSize(10);
        doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      },
    });

    const fileName = `Dashboard_${metricDisplayName.replace(/[^a-z0-9]/gi, "_")}_${dashboardYear}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to download PDF");
  }
}
