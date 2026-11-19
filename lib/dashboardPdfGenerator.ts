import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
  getNewlyOnboardedExemptEntry,
  isExcludedFromDashboardReport,
  isNewlyOnboardedExemptMda,
  NEWLY_ONBOARDED_EXEMPT_MDAS,
  NEWLY_ONBOARDED_EXEMPT_NOTE,
} from "./dashboardReportExclusions";
import { formatMdaNameForBeepaReport } from "./beepaTrackerRoster";

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
  /** When true, keep the incoming row order (already ranked like the Live Dashboard). */
  preserveOrder?: boolean;
}

function isExcluded(mda: any, metric: string): boolean {
  const excluded: string[] = Array.isArray(mda.excludedMetrics) ? mda.excludedMetrics : [];
  return excluded.includes(metric);
}

function isOthersItemExcluded(mda: any, itemId: string): boolean {
  const excluded: string[] = Array.isArray(mda.excludedMetrics) ? mda.excludedMetrics : [];
  return excluded.includes("others") || excluded.includes(`others:${itemId}`);
}

/** Same ranking key as DashboardTable.getMetricScore — must stay in sync. */
function metricSortValue(mda: any, selectedMetric: string): number {
  // Overall ranking uses absolute Final Score points (highest → lowest).
  if (selectedMetric === "totalScore") return Number(mda.totalScore) || 0;
  if (selectedMetric === "mysteryShopping") {
    return isExcluded(mda, "mystery") ? 0 : Number(mda.mysteryShopping?.score) || 0;
  }
  if (selectedMetric === "sla") {
    return isExcluded(mda, "sla") ? 0 : Number(mda.sla?.score) || 0;
  }
  if (selectedMetric === "controversial") {
    return isExcluded(mda, "controversial") ? 0 : Number(mda.controversial?.score) || 0;
  }
  if (selectedMetric === "toutingRentseeking") {
    return isExcluded(mda, "toutingRentseeking")
      ? 0
      : Number(mda.toutingRentseeking?.score) || 0;
  }
  if (selectedMetric === "innovation") {
    return isExcluded(mda, "innovation") ? 0 : Number(mda.innovation?.score) || 0;
  }
  if (selectedMetric === "stakeholder") {
    return isExcluded(mda, "stakeholder") ? 0 : Number(mda.stakeholder?.score) || 0;
  }
  if (selectedMetric === "transparency") {
    return isExcluded(mda, "transparency") ? 0 : Number(mda.transparency?.score) || 0;
  }
  if (selectedMetric === "reportGovResolution") {
    return isExcluded(mda, "reportGov") ? 0 : Number(mda.reportGovResolution?.score) || 0;
  }
  if (selectedMetric === "monthlyReport") {
    return isExcluded(mda, "reportSubmission") ? 0 : Number(mda.monthlyReport?.score) || 0;
  }
  if (selectedMetric === "timeliness") {
    return isExcluded(mda, "timeliness") ? 0 : Number(mda.timeliness?.score) || 0;
  }
  if (selectedMetric === "efficiency") {
    const slaScore = isExcluded(mda, "sla") ? 0 : Number(mda.sla?.score) || 0;
    const reportScore = isExcluded(mda, "reportSubmission")
      ? 0
      : Number(mda.monthlyReport?.score) || 0;
    const timelinessScore = isExcluded(mda, "timeliness")
      ? 0
      : Number(mda.timeliness?.score) || 0;
    return slaScore + reportScore + timelinessScore;
  }
  if (selectedMetric === "penalties") {
    return isExcluded(mda, "penalties") ? 0 : Number(mda.penalties?.score) || 0;
  }
  if (selectedMetric === "bonuses") {
    return isExcluded(mda, "bonuses") ? 0 : Number(mda.bonuses?.score) || 0;
  }
  if (selectedMetric.startsWith("others:")) {
    const itemId = selectedMetric.replace("others:", "");
    return isOthersItemExcluded(mda, itemId)
      ? 0
      : Number(mda.others?.scores?.[itemId]) || 0;
  }
  if (selectedMetric === "others") {
    return isExcluded(mda, "others") ? 0 : Number(mda.others?.score) || 0;
  }
  return Number(mda.totalScore) || 0;
}

function cellScore(score: number | undefined | null, max: number, skipped = false): string {
  if (skipped) return `0/${max}\nSkipped`;
  if (score == null || !Number.isFinite(score)) return "—";
  return `${Number(score).toFixed(1)}/${max}`;
}

function cellScoreWithMonths(
  score: number | undefined | null,
  max: number,
  monthsWithData?: number | null,
  totalMonths?: number | null
): string {
  const top = cellScore(score, max);
  if (
    monthsWithData != null &&
    totalMonths != null &&
    Number.isFinite(monthsWithData) &&
    Number.isFinite(totalMonths) &&
    totalMonths > 0
  ) {
    return `${top}\n${monthsWithData}/${totalMonths} months`;
  }
  return top;
}

function formatOthersValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) {
    // Avoid float noise like 1.6999999999999997 — one decimal is enough.
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return "—";
}

function formatFinalPercentage(pct: number): string {
  // Single rounded whole-number percent (round half up).
  const rounded = Math.round(Number(pct) || 0);
  return `${rounded}%`;
}

/**
 * Dashboard PDF uses the same columns, sort order, and cell values as the Live Dashboard table.
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
  preserveOrder = false,
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
      totalScore: "BFA Scoring Table",
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

    const pdfTitle =
      selectedMetric === "totalScore"
        ? "BFA Scoring Table"
        : `BFA Scoring Table - ${metricDisplayName}`;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(pdfTitle, pageWidth / 2, yPosition, {
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
    if (selectedMetric === "totalScore" && dashboardYear >= 2026) {
      yPosition += 2;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      const legendLines = doc.splitTextToSize(
        "Note: Metrics that are not applicable (e.g. BEEPA exemption, Mystery Testing Service not tested, SERVICOM monthly scoring exemption) are removed from that MDA’s applicable maximum — they are not scored as zero. Scores are then converted to a /100 Final Score so MDAs are not penalised for inapplicable metrics. For Testing Service: full marks on the remaining channels (e.g. 20/20) equals full Mystery (same as 40/40).",
        pageWidth - 20
      );
      doc.text(legendLines, pageWidth / 2, yPosition, { align: "center" });
      yPosition += legendLines.length * 3.2 + 2;
      doc.setFont("helvetica", "normal");
    }
    yPosition += 6;

    const allMdasArray = liveDashboardData
      .filter((mda: any) => !isExcludedFromDashboardReport(mda?.mdaName || mda?.name || ""))
      .map((mda: any) => ({
        ...mda,
        baseTotalScore: Number(mda.totalGrossScore ?? mda.baseTotalScore ?? mda.totalScore) || 0,
        totalScore: Number(mda.totalScore) || 0,
        totalPercentage: Number(mda.totalPercentage) || 0,
        maxPossiblePoints: Number(mda.maxPossiblePoints) || (dashboardYear >= 2026 ? 100 : 90),
      }));

    const rankedPool = allMdasArray.filter(
      (mda) => !isNewlyOnboardedExemptMda(mda?.mdaName || mda?.name || "")
    );
    const onboardedFromData = allMdasArray.filter((mda) =>
      isNewlyOnboardedExemptMda(mda?.mdaName || mda?.name || "")
    );

    const sortedRanked = preserveOrder
      ? rankedPool
      : [...rankedPool].sort((a, b) => {
          const diff = metricSortValue(b, selectedMetric) - metricSortValue(a, selectedMetric);
          if (diff !== 0) return diff;
          if (selectedMetric === "totalScore") {
            const pctDiff =
              (Number(b.totalPercentage) || 0) - (Number(a.totalPercentage) || 0);
            if (pctDiff !== 0) return pctDiff;
          }
          return String(a.mdaName || "").localeCompare(String(b.mdaName || ""));
        });

    // Always list all five newly onboarded agencies at the bottom (stub if missing from data).
    const usedOnboarded = new Set<string>();
    const onboardedBottom = NEWLY_ONBOARDED_EXEMPT_MDAS.map((entry) => {
      const existing = onboardedFromData.find((mda) => {
        const match = getNewlyOnboardedExemptEntry(mda?.mdaName || "");
        if (!match || match.abbreviation !== entry.abbreviation) return false;
        if (usedOnboarded.has(match.abbreviation)) return false;
        return true;
      });
      if (existing) {
        usedOnboarded.add(entry.abbreviation);
        return {
          ...existing,
          mdaName: `${entry.abbreviation} - ${entry.name}`,
        };
      }
      return {
        mdaName: `${entry.abbreviation} - ${entry.name}`,
      };
    });

    const slaMax = efficiencyConfig?.slaPoints || (dashboardYear >= 2026 ? 5 : 30);
    const reportGovMax = efficiencyConfig?.reportGovPoints || (dashboardYear >= 2026 ? 20 : 15);
    const monthlyMax =
      efficiencyConfig?.reportSubmissionPoints || (dashboardYear >= 2026 ? 2 : 3);
    const timelinessMax = efficiencyConfig?.timelinessPoints || (dashboardYear >= 2026 ? 3 : 2);

    const tableData: string[][] = [];
    let head: string[] = [];

    if (selectedMetric === "totalScore" && dashboardYear >= 2026) {
      // Exact Live Dashboard column set / order.
      head = [
        "Rank",
        "MDA Name",
        "SLA (Efficiency)",
        "Mystery Shopping",
        ...othersConfig.map((item) => item.itemName),
        "Report Gov Resolution",
        "Report Submission",
        "Timeliness",
        ...penaltyConfig.map((item) => item.penaltyName),
        ...bonusConfig.map((item) => item.bonusName),
        "Final Score",
      ];

      const dashCell = () => "—";
      const emptyOthers = othersConfig.map(() => dashCell());
      const emptyPenalties = penaltyConfig.map(() => dashCell());
      const emptyBonuses = bonusConfig.map(() => dashCell());

      const pushRankedRow = (mda: any, rankLabel: string, finalCell: string) => {
        const mysteryMax = Number(mda.mysteryShopping?.maxPossibleScore) || 40;
        const beepaExcludedInData = othersConfig.some((item) => {
          const nameKey = String(item.itemName || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
          return (
            (nameKey === "beepa" || nameKey.includes("beepa")) &&
            isOthersItemExcluded(mda, item.itemId)
          );
        });
        const othersCells = othersConfig.map((item) => {
          if (isOthersItemExcluded(mda, item.itemId)) return "Excluded";
          const score = Number(mda.others?.scores?.[item.itemId]) || 0;
          const value = formatOthersValue(mda.others?.values?.[item.itemId]);
          return `${cellScore(score, item.weight || 0)}\n${value}`;
        });
        const penaltyCells = penaltyConfig.map((item) => {
          if (isExcluded(mda, "penalties")) return "Excluded";
          const applied = mda.penalties?.values?.[item.penaltyId] === true;
          return applied ? String(item.penaltyValue ?? 0) : "0.0";
        });
        const bonusCells = bonusConfig.map((item) => {
          if (isExcluded(mda, "bonuses")) return "Excluded";
          const applied = mda.bonuses?.values?.[item.bonusId] === true;
          return applied ? `+${item.bonusValue ?? 0}` : "0.0";
        });

        tableData.push([
          rankLabel,
          formatMdaNameForBeepaReport(mda.mdaName, null, {
            beepaExcluded: beepaExcludedInData,
            testingServiceExempt: !!mda.isTestingServiceExempt,
          }),
          isExcluded(mda, "sla")
            ? "Excluded"
            : cellScoreWithMonths(
                mda.sla?.score,
                Number(mda.sla?.maxPossibleScore) || slaMax,
                mda.sla?.monthsWithData,
                mda.sla?.totalMonths
              ),
          isExcluded(mda, "mystery")
            ? "Excluded"
            : mda.isTestingServiceExempt
              ? `${cellScore(mda.mysteryShopping?.score, mysteryMax)}\n(Full on tested; Testing Service N/A)`
              : cellScore(mda.mysteryShopping?.score, mysteryMax),
          ...othersCells,
          isExcluded(mda, "reportGov")
            ? "Excluded"
            : cellScore(
                mda.reportGovResolution?.score,
                Number(mda.reportGovResolution?.maxPossibleScore) || reportGovMax,
                !!mda.reportGovResolution?.isSkipped
              ),
          isExcluded(mda, "reportSubmission")
            ? "Excluded"
            : cellScoreWithMonths(
                mda.monthlyReport?.score,
                Number(mda.monthlyReport?.maxPossibleScore) || monthlyMax,
                mda.monthlyReport?.monthsWithData,
                mda.monthlyReport?.totalMonths
              ),
          isExcluded(mda, "timeliness")
            ? "Excluded"
            : cellScoreWithMonths(
                mda.timeliness?.score,
                Number(mda.timeliness?.maxPossibleScore) || timelinessMax,
                mda.timeliness?.monthsWithData,
                mda.timeliness?.totalMonths
              ),
          ...penaltyCells,
          ...bonusCells,
          finalCell,
        ]);
      };

      sortedRanked.forEach((mda, idx) => {
        const maxPts = Number(mda.maxPossiblePoints) || 100;
        const finalPts = Number(mda.totalScore) || 0;
        pushRankedRow(
          mda,
          `#${idx + 1}`,
          `${finalPts.toFixed(1)}/${maxPts}\n${formatFinalPercentage(Number(mda.totalPercentage || 0))}`
        );
      });

      onboardedBottom.forEach((mda) => {
        tableData.push([
          "—",
          mda.mdaName,
          dashCell(),
          dashCell(),
          ...emptyOthers,
          dashCell(),
          dashCell(),
          dashCell(),
          ...emptyPenalties,
          ...emptyBonuses,
          NEWLY_ONBOARDED_EXEMPT_NOTE,
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
      sortedRanked.forEach((mda, idx) => {
        const maxPts = Number(mda.maxPossiblePoints) || 90;
        const pct = Number(mda.totalPercentage || 0);
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
          `${Number(mda.baseTotalScore || 0).toFixed(1)}/${maxPts}`,
          (Number(mda.controversial?.score) || 0).toFixed(1),
          (Number(mda.toutingRentseeking?.score) || 0).toFixed(1),
          formatFinalPercentage(pct),
        ]);
      });
      onboardedBottom.forEach((mda) => {
        tableData.push([
          "—",
          mda.mdaName,
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          NEWLY_ONBOARDED_EXEMPT_NOTE,
        ]);
      });
    } else {
      head = ["Rank", "MDA Name", `${metricDisplayName}`];
      sortedRanked.forEach((mda, idx) => {
        const value = metricSortValue(mda, selectedMetric);
        tableData.push([
          `#${idx + 1}`,
          mda.mdaName,
          Number.isFinite(value) ? value.toFixed(2) : "—",
        ]);
      });
    }

    const manyCols = head.length > 12;
    autoTable(doc, {
      startY: yPosition,
      head: [head],
      body: tableData,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: selectedMetric === "totalScore" ? (manyCols ? 5.5 : 7) : 9,
      },
      bodyStyles: { fontSize: selectedMetric === "totalScore" ? (manyCols ? 5.5 : 6.5) : 9 },
      styles: {
        fontSize: selectedMetric === "totalScore" ? (manyCols ? 5.5 : 6.5) : 9,
        cellPadding: manyCols ? 1 : 1.5,
        overflow: "linebreak",
      },
      theme: "striped",
      margin: { left: 6, right: 6 },
      columnStyles:
        selectedMetric === "totalScore" && dashboardYear >= 2026
          ? {
              // Rank + MDA name (with BEEPA status note under the name)
              0: { cellWidth: 10 },
              1: { cellWidth: 42, fontSize: manyCols ? 5 : 5.5 },
            }
          : undefined,
      didDrawPage: (data: any) => {
        doc.setFontSize(10);
        doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      },
    });

    if (selectedMetric === "totalScore" && dashboardYear >= 2026) {
      const tableEndY =
        (doc as any).lastAutoTable?.finalY != null
          ? Number((doc as any).lastAutoTable.finalY)
          : yPosition;
      let methodY = tableEndY + 10;
      const left = 10;
      const contentWidth = pageWidth - 20;
      const ensureSpace = (needed: number) => {
        if (methodY + needed > pageHeight - 16) {
          doc.addPage();
          methodY = 16;
        }
      };

      ensureSpace(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("BFA Compliance Assessment and Ranking Methodology", left, methodY);
      methodY += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const methodologyParagraphs = [
        "The BFA compliance assessment was based on a total of ten (10) metrics. However, not all metrics were applicable to every Ministry, Department, and Agency (MDA). Consequently, while some MDAs were assessed against all ten (10) metrics, others were assessed against eight (8) or nine (9), depending on the applicability of the metrics to their operations.",
        "To ensure fairness, consistency, and comparability in the assessment and ranking process, it was agreed that each MDA’s compliance score would be calculated based on the total number of metrics applicable to and assessed for that MDA, rather than the overall ten (10) metrics.",
        "The resulting scores would then be converted into percentages and used as the basis for ranking all MDAs. This approach ensures that MDAs are not penalised for metrics that are not applicable to them, while maintaining a standardised and equitable basis for comparing compliance performance across all MDAs.",
      ];
      for (const paragraph of methodologyParagraphs) {
        const lines = doc.splitTextToSize(paragraph, contentWidth);
        ensureSpace(lines.length * 3.6 + 4);
        doc.text(lines, left, methodY);
        methodY += lines.length * 3.6 + 3;
      }

      ensureSpace(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Calculation", left, methodY);
      methodY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const calcLines = doc.splitTextToSize(
        "Compliance Score (%) = (Points earned ÷ Points from applicable metrics) × 100",
        contentWidth
      );
      doc.text(calcLines, left, methodY);
      methodY += calcLines.length * 3.6 + 3;
      const exampleLines = doc.splitTextToSize(
        "For example, an MDA that earned 70 out of 80 applicable points would receive a compliance score of 87.5%, while an MDA that earned 90 out of 100 would receive 90%. Final Score is shown out of 100 after normalisation so rankings remain comparable.",
        contentWidth
      );
      ensureSpace(exampleLines.length * 3.6 + 2);
      doc.text(exampleLines, left, methodY);
    }

    const fileName = `${pdfTitle.replace(/[^a-z0-9]/gi, "_")}_${dashboardYear}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to download PDF");
  }
}
