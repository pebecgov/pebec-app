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
  const band = CARD_BANDS.find((entry) => percentage >= entry.threshold) ?? CARD_BANDS[CARD_BANDS.length - 1];
  return band;
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
    const marginY = 16;
    let yPosition = marginY + 10;

    // Attempt to add logo
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
      yPosition = marginY + 20;
    } catch (error) {
      console.error("Error loading logo:", error);
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("PEBEC", pageWidth / 2, 20, { align: "center" });
      yPosition = marginY + 15;
    }

    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text(stateName, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(
      `Overall Score: ${overallTotalScore.toFixed(1)}/${overallMaxScore.toFixed(1)} (${overallPercentage.toFixed(1)}%)`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );
    yPosition += 6;

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
    yPosition += 12;

    const maxCards = 16;
    const cards = indicators.slice(0, maxCards);
    const columns = 4;
    const rows = 4;
    const gapX = 6;
    const gapY = 8;
    const cardAreaTop = yPosition;
    const availableHeight = pageHeight - cardAreaTop - marginY;
    const cardWidth = (pageWidth - marginX * 2 - gapX * (columns - 1)) / columns;
    const cardHeight = (availableHeight - gapY * (rows - 1)) / rows;

    cards.forEach((indicator, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = marginX + col * (cardWidth + gapX);
      const y = cardAreaTop + row * (cardHeight + gapY);

      const { background, accent, text } = getCardColors(isFinite(indicator.percentage) ? indicator.percentage : 0);
      const [bgR, bgG, bgB] = hexToRgb(background);
      const [accentR, accentG, accentB] = hexToRgb(accent);
      const [textR, textG, textB] = hexToRgb(text);

      doc.setDrawColor(bgR, bgG, bgB);
      doc.setFillColor(bgR, bgG, bgB);
      doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, "FD");

      doc.setFillColor(accentR, accentG, accentB);
      doc.circle(x + 9, y + 10, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, "bold");
      doc.text(`${index + 1}`, x + 9, y + 10, { align: "center", baseline: "middle" });

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setTextColor(textR, textG, textB);
      const titleLines = doc.splitTextToSize(indicator.indicatorName || "Indicator", cardWidth - 18);
      doc.text(titleLines, x + 16, y + 18);

      const percentage = isFinite(indicator.percentage) ? indicator.percentage : 0;
      doc.setFontSize(20);
      doc.setFont(undefined, "bold");
      doc.setTextColor(accentR, accentG, accentB);
      doc.text(
        `${percentage.toFixed(1)}%`,
        x + cardWidth / 2,
        y + cardHeight / 2 + 2,
        { align: "center", baseline: "middle" }
      );

      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(textR, textG, textB);
      const maxScore = indicator.maxScore || 0;
      doc.text(
        `Score: ${indicator.totalScore.toFixed(1)}/${maxScore.toFixed(1)}`,
        x + cardWidth / 2,
        y + cardHeight - 8,
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

