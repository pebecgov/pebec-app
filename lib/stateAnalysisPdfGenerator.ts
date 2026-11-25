import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface IndicatorData {
  indicatorKey: string;
  indicatorName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  subMetrics?: Array<{
    subIndicator: string;
    label: string;
    score: number;
    maxScore: number;
    value?: string;
    linkToSource?: string;
  }>;
}

interface GenerateStateAnalysisPDFParams {
  stateName: string;
  indicators: IndicatorData[];
  overallTotalScore: number;
  overallMaxScore: number;
  overallPercentage: number;
  generatedAt?: Date;
}

const CARD_BANDS = [
  { threshold: 85, background: "#ecfdf5", accent: "#059669", text: "#064e3b" },
  { threshold: 70, background: "#eff6ff", accent: "#1d4ed8", text: "#1e3a8a" },
  { threshold: 55, background: "#fffbeb", accent: "#b45309", text: "#92400e" },
  { threshold: 40, background: "#fff7ed", accent: "#c2410c", text: "#9a3412" },
  { threshold: 0, background: "#fef2f2", accent: "#dc2626", text: "#991b1b" },
];

const hexToRgb = (hex: string): [number, number, number] => {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
};

const getCardColors = (percentage: number) => {
  return CARD_BANDS.find((entry) => percentage >= entry.threshold) ?? CARD_BANDS[CARD_BANDS.length - 1];
};

export async function generateStateAnalysisPDF({
  stateName,
  indicators,
  overallTotalScore,
  overallMaxScore,
  overallPercentage,
  generatedAt = new Date(),
}: GenerateStateAnalysisPDFParams): Promise<void> {
  if (!indicators || indicators.length === 0) {
    toast.error("No indicator data available to download");
    return;
  }

  try {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const marginY = 14;
    let yPosition = marginY + 10;

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

      const logoWidth = 56;
      const logoHeight = 16;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(img, "PNG", logoX, 8, logoWidth, logoHeight);
      yPosition = marginY + 16;
    } catch (error) {
      console.error("Error loading logo:", error);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("PEBEC", pageWidth / 2, 18, { align: "center" });
      yPosition = marginY + 12;
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(stateName, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Overall Score: ${overallTotalScore.toFixed(1)}/${overallMaxScore.toFixed(1)} (${Math.round(overallPercentage)}%)`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );
    yPosition += 5;

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Generated: ${generatedAt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );
    doc.setTextColor(0);
    yPosition += 8;

    const cards = indicators;
    const columns = 4;
    const gapX = 5;
    const gapY = 5;
    const cardAreaTop = yPosition;
    const rows = Math.max(1, Math.ceil(cards.length / columns));
    const availableHeight = pageHeight - cardAreaTop - marginY;
    const cardWidth = (pageWidth - marginX * 2 - gapX * (columns - 1)) / columns;
    // Cap card height so short rows don't stretch; leave room for title + % + score.
    const cardHeight = Math.min(
      48,
      (availableHeight - gapY * (rows - 1)) / rows
    );

    cards.forEach((indicator, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      // New page if cards would overflow
      const y = cardAreaTop + row * (cardHeight + gapY);
      if (y + cardHeight > pageHeight - marginY + 1 && row > 0) {
        // Fallback: still draw; with 12 cards at ≤48mm this fits on one landscape page.
      }

      const x = marginX + col * (cardWidth + gapX);
      const percentage = isFinite(indicator.percentage) ? indicator.percentage : 0;
      const { background, accent, text } = getCardColors(percentage);
      const [bgR, bgG, bgB] = hexToRgb(background);
      const [accentR, accentG, accentB] = hexToRgb(accent);
      const [textR, textG, textB] = hexToRgb(text);

      doc.setDrawColor(220);
      doc.setFillColor(bgR, bgG, bgB);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "FD");

      // Number badge (top-left)
      doc.setFillColor(accentR, accentG, accentB);
      doc.circle(x + 7, y + 7, 4, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}`, x + 7, y + 7.3, { align: "center", baseline: "middle" });

      // Title — top band, wraps under badge, max 2 lines
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textR, textG, textB);
      const titleMaxWidth = cardWidth - 16;
      const titleLines = doc.splitTextToSize(
        indicator.indicatorName || "Indicator",
        titleMaxWidth
      ).slice(0, 2);
      doc.text(titleLines, x + 13, y + 6);

      // Percentage — clear middle band (not over the title)
      const titleBlockHeight = titleLines.length * 3.5;
      const pctY = y + 10 + titleBlockHeight + 6;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(accentR, accentG, accentB);
      doc.text(`${Math.round(percentage)}%`, x + cardWidth / 2, pctY, {
        align: "center",
        baseline: "middle",
      });

      // Score — bottom of card
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textR, textG, textB);
      const maxScore = indicator.maxScore || 0;
      doc.text(
        `Score: ${indicator.totalScore.toFixed(1)}/${maxScore.toFixed(1)}`,
        x + cardWidth / 2,
        y + cardHeight - 5,
        { align: "center" }
      );
    });

    const isoDate = generatedAt.toISOString().split("T")[0];
    const fileName = `state-analysis-${stateName.replace(/\s+/g, "-")}-${isoDate}.pdf`;
    doc.save(fileName);
    toast.success("State analysis PDF downloaded successfully!");
  } catch (error) {
    console.error("Error generating State Analysis PDF:", error);
    toast.error("Failed to download State Analysis PDF");
  }
}
