import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface SubMetricScore {
  subIndicator: string;
  label: string;
  score: number;
  maxScore: number;
  value?: string;
}

interface IndicatorData {
  indicatorKey: string;
  indicatorName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  subMetrics: SubMetricScore[];
}

interface GenerateStateAnalysisPDFParams {
  stateName: string;
  indicators: IndicatorData[];
  overallTotalScore: number;
  overallMaxScore: number;
  overallPercentage: number;
  generatedAt?: Date;
}

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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 30;

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
      yPosition = 40;
    } catch (error) {
      console.error("Error loading logo:", error);
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("PEBEC", pageWidth / 2, 20, { align: "center" });
      yPosition = 35;
    }

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(`${stateName} - State Analysis Report`, pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 8;

    // Overall Summary
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text(
      `Overall Score: ${overallTotalScore.toFixed(1)}/${overallMaxScore.toFixed(1)} (${overallPercentage.toFixed(1)}%)`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );
    yPosition += 6;

    doc.setFontSize(10);
    doc.text(
      `Generated: ${generatedAt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );
    yPosition += 10;

    // Process each indicator
    for (let i = 0; i < indicators.length; i++) {
      const indicator = indicators[i];

      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Indicator Header
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(
        `${i + 1}. ${indicator.indicatorName}`,
        14,
        yPosition
      );
      yPosition += 6;

      // Indicator Summary
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Score: ${indicator.totalScore.toFixed(1)}/${indicator.maxScore.toFixed(1)} | Percentage: ${indicator.percentage.toFixed(1)}%`,
        14,
        yPosition
      );
      yPosition += 8;

      // Sub-metrics table
      if (indicator.subMetrics && indicator.subMetrics.length > 0) {
        const subMetricData = indicator.subMetrics.map((subMetric) => [
          subMetric.label,
          `${subMetric.score.toFixed(1)}/${subMetric.maxScore.toFixed(1)}`,
          `${((subMetric.score / subMetric.maxScore) * 100).toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Sub-Metric", "Score", "Percentage"]],
          body: subMetricData,
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: { fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          theme: "striped",
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 30, halign: "center" },
            2: { cellWidth: 30, halign: "center" },
          },
        });

        // Get the final Y position after the table
        const finalY = (doc as any).lastAutoTable.finalY || yPosition + 20;
        yPosition = finalY + 5;
      } else {
        yPosition += 5;
      }

      // Add spacing between indicators
      yPosition += 3;
    }

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(
        `Generated by PEBEC State Analysis System`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - 20,
        pageHeight - 10,
        { align: "right" }
      );
    }

    const isoDate = generatedAt.toISOString().split("T")[0];
    const fileName = `state-analysis-${stateName.replace(/\s+/g, "-")}-${isoDate}.pdf`;
    doc.save(fileName);
    toast.success("State analysis PDF downloaded successfully!");
  } catch (error) {
    console.error("Error generating State Analysis PDF:", error);
    toast.error("Failed to download State Analysis PDF");
  }
}

