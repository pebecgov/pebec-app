import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";

interface MdaList {
  name: string;
}

// Helper function to strip abbreviation prefix from MDA names (e.g., "FME - Federal Ministry" -> "Federal Ministry")
function stripAbbreviation(mdaName: string): string {
  if (!mdaName) return mdaName;
  // Remove pattern like "ABC - " or "ABC -" from the start
  const match = mdaName.match(/^[A-Z]+ - (.+)$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return mdaName.trim();
}

interface DashboardData {
  mdaName: string;
  sla?: { score: number; monthsWithData?: number };
  mysteryShopping?: { score: number };
  collaboration?: { score: number };
  stakeholder?: { score: number };
  reportGovernance?: { score: number };
  reportGovResolution?: { score: number };
  monthlyReport?: { score: number; monthsWithData?: number };
  timeliness?: { score: number; monthsWithData?: number };
}

interface GenerateDashboardPDFParams {
  liveDashboardData: DashboardData[];
  selectedMetric: string;
  dashboardYear: number;
  mdasList: MdaList[];
  filterType?: 'all' | 'withData'; // Optional filter type
}

export async function generateDashboardPDF({
  liveDashboardData,
  selectedMetric,
  dashboardYear,
  mdasList,
  filterType = 'all'
}: GenerateDashboardPDFParams): Promise<void> {
  if (!liveDashboardData || !Array.isArray(liveDashboardData) || liveDashboardData.length === 0) {
    toast.error("No data available to download");
    return;
  }

  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 30;

    // Add logo in the center
    try {
      const logoUrl = '/images/logo/logo_pebec1.PNG';
      const img = new Image();
      img.src = logoUrl;
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(() => reject(new Error('Logo load timeout')), 5000);
      });
      const logoWidth = 60;
      const logoHeight = 18;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(img, 'PNG', logoX, 10, logoWidth, logoHeight);
      yPosition = 40;
    } catch (error) {
      console.error('Error loading logo:', error);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('PEBEC', pageWidth / 2, 20, { align: 'center' });
      yPosition = 35;
    }

    // Get metric display name
    const metricNames: { [key: string]: string } = {
      'totalScore': 'Total Score (All Metrics)',
      'mysteryShopping': 'Mystery Shopping',
      'sla': 'Service Level Agreement',
      'collaboration': 'Inter MDA Collaboration',
      'stakeholder': 'Stakeholder Engagement',
      'reportGovernance': 'Report Governance',
      'reportGovResolution': 'Report Gov Resolution',
      'monthlyReport': 'Monthly Report Submission',
      'timeliness': 'Timeliness'
    };

    const metricDisplayName = metricNames[selectedMetric] || selectedMetric;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Live Scoring Dashboard - ${metricDisplayName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Year: ${dashboardYear}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    if (filterType === 'withData') {
      doc.setFontSize(10);
      doc.text(`Filter: MDAs with Data`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
    }
    yPosition += 10;

    // Process data - if filterType is 'withData', use the filtered data directly
    // Otherwise, merge with all MDAs from mdasList
    let allMdasArray: any[];
    
    if (filterType === 'withData') {
      // Use filtered data directly - it's already processed and filtered
      allMdasArray = liveDashboardData.map((mda: any) => {
        // Calculate total score for each MDA
        const slaScore = mda.sla?.score || 0;
        const mysteryScore = mda.mysteryShopping?.score || 0;
        const collaborationScore = mda.collaboration?.score || 0;
        const stakeholderScore = mda.stakeholder?.score || 0;
        const reportGovScore = mda.reportGovernance?.score || 0;
        const reportGovResScore = mda.reportGovResolution?.score || 0;
        const monthlyReportScore = mda.monthlyReport?.score || 0;
        const timelinessScore = mda.timeliness?.score || 0;
        
        const totalScore = slaScore + mysteryScore + collaborationScore + stakeholderScore + 
                          reportGovScore + reportGovResScore + monthlyReportScore + timelinessScore;
        
        // Check if Report Gov Resolution is skipped
        const isReportGovSkipped = mda.reportGovResolution?.isSkipped || false;
        const maxPossiblePoints = isReportGovSkipped ? 85 : 100;
        
        // Normalize percentage: if skipped, 85 points = 100% for fair ranking
        const totalPercentage = isReportGovSkipped 
          ? (totalScore / 85) * 100  // Normalize: 85 points = 100%
          : (totalScore / 100) * 100; // Standard: 100 points = 100%
        
        return {
          ...mda,
          totalScore,
          totalPercentage,
          isReportGovSkipped,
          maxPossiblePoints
        };
      });
    } else {
      // Process data similar to how it's done in the table - merge with all MDAs
      const allMdasMap = new Map<string, any>();
      mdasList.forEach(mda => {
        allMdasMap.set(mda.name, {
          mdaName: mda.name,
          sla: null,
          mysteryShopping: null,
          collaboration: null,
          stakeholder: null,
          reportGovernance: null,
          reportGovResolution: null,
          monthlyReport: null,
          timeliness: null,
          totalScore: 0,
          totalPercentage: 0
        });
      });

      liveDashboardData.forEach((mda: any) => {
        // Strip abbreviation from backend MDA name for matching
        const cleanedMdaName = stripAbbreviation(mda.mdaName);
        if (allMdasMap.has(cleanedMdaName)) {
          const existing = allMdasMap.get(cleanedMdaName);
          allMdasMap.set(cleanedMdaName, {
            ...existing,
            ...mda,
            mdaName: cleanedMdaName // Use cleaned name without abbreviation
          });
        } else {
          // Add MDAs that might not be in mdasList but have data
          allMdasMap.set(cleanedMdaName, {
            ...mda,
            mdaName: cleanedMdaName // Use cleaned name without abbreviation
          });
        }
      });

      allMdasArray = Array.from(allMdasMap.values()).map((mda: any) => {
        const slaScore = mda.sla?.score || 0;
        const mysteryScore = mda.mysteryShopping?.score || 0;
        const collaborationScore = mda.collaboration?.score || 0;
        const stakeholderScore = mda.stakeholder?.score || 0;
        const reportGovScore = mda.reportGovernance?.score || 0;
        const reportGovResScore = mda.reportGovResolution?.score || 0;
        const monthlyReportScore = mda.monthlyReport?.score || 0;
        const timelinessScore = mda.timeliness?.score || 0;
        
        const totalScore = slaScore + mysteryScore + collaborationScore + stakeholderScore + 
                          reportGovScore + reportGovResScore + monthlyReportScore + timelinessScore;
        
        // Check if Report Gov Resolution is skipped
        const isReportGovSkipped = mda.reportGovResolution?.isSkipped || false;
        const maxPossiblePoints = isReportGovSkipped ? 85 : 100;
        
        // Normalize percentage: if skipped, 85 points = 100% for fair ranking
        const totalPercentage = isReportGovSkipped 
          ? (totalScore / 85) * 100  // Normalize: 85 points = 100%
          : (totalScore / 100) * 100; // Standard: 100 points = 100%
        
        return {
          ...mda,
          totalScore,
          totalPercentage,
          isReportGovSkipped,
          maxPossiblePoints
        };
      });
    }

    // Sort by selected metric
    const sortedData = [...allMdasArray].sort((a: any, b: any) => {
      let aValue: any = 0;
      let bValue: any = 0;
      
      if (selectedMetric === 'totalScore') {
        aValue = a.totalPercentage || 0; // Use normalized percentage for fair ranking
        bValue = b.totalPercentage || 0;
      } else if (selectedMetric === 'mysteryShopping') {
        aValue = a.mysteryShopping?.score || 0;
        bValue = b.mysteryShopping?.score || 0;
      } else if (selectedMetric === 'sla') {
        aValue = a.sla?.score || 0;
        bValue = b.sla?.score || 0;
      } else if (selectedMetric === 'collaboration') {
        aValue = a.collaboration?.score || 0;
        bValue = b.collaboration?.score || 0;
      } else if (selectedMetric === 'stakeholder') {
        aValue = a.stakeholder?.score || 0;
        bValue = b.stakeholder?.score || 0;
      } else if (selectedMetric === 'reportGovernance') {
        aValue = a.reportGovernance?.score || 0;
        bValue = b.reportGovernance?.score || 0;
      } else if (selectedMetric === 'reportGovResolution') {
        aValue = a.reportGovResolution?.score || 0;
        bValue = b.reportGovResolution?.score || 0;
      } else if (selectedMetric === 'monthlyReport') {
        aValue = a.monthlyReport?.score || 0;
        bValue = b.monthlyReport?.score || 0;
      } else if (selectedMetric === 'timeliness') {
        aValue = a.timeliness?.score || 0;
        bValue = b.timeliness?.score || 0;
      }
      
      return bValue - aValue;
    });

    // Calculate ranks
    const rankMap = new Map<string, number>();
    sortedData.forEach((mda: any, idx: number) => {
      rankMap.set(mda.mdaName, idx + 1);
    });

    // Prepare table data
    const tableData: string[][] = [];
    sortedData.forEach((mda: any) => {
      const rank = rankMap.get(mda.mdaName) || sortedData.length;
      let score = 0;
      let maxScore = 100;
      let overallPercentage = 0;
      
      if (selectedMetric === 'totalScore') {
        score = mda.totalScore || 0;
        maxScore = 100;
        overallPercentage = mda.totalPercentage || 0; // Use normalized percentage
      } else if (selectedMetric === 'mysteryShopping') {
        score = mda.mysteryShopping?.score || 0;
        maxScore = 20;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (selectedMetric === 'sla') {
        score = mda.sla?.score || 0;
        maxScore = 30;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (selectedMetric === 'collaboration') {
        score = mda.collaboration?.score || 0;
        maxScore = 15;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (selectedMetric === 'stakeholder') {
        score = mda.stakeholder?.score || 0;
        maxScore = 10;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (selectedMetric === 'reportGovernance') {
        score = mda.reportGovernance?.score || 0;
        maxScore = 5;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (selectedMetric === 'reportGovResolution') {
        score = mda.reportGovResolution?.score || 0;
        maxScore = 15;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (selectedMetric === 'monthlyReport') {
        score = mda.monthlyReport?.score || 0;
        maxScore = 3;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      } else if (selectedMetric === 'timeliness') {
        score = mda.timeliness?.score || 0;
        maxScore = 2;
        overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      }

      if (selectedMetric === 'totalScore') {
        tableData.push([
          `#${rank}`,
          mda.mdaName,
          mda.sla ? `${mda.sla.score.toFixed(1)}/30` : '—',
          mda.mysteryShopping ? `${mda.mysteryShopping.score.toFixed(1)}/20` : '—',
          mda.collaboration ? `${mda.collaboration.score.toFixed(1)}/15` : '—',
          mda.stakeholder ? `${mda.stakeholder.score.toFixed(1)}/10` : '—',
          mda.reportGovernance ? `${mda.reportGovernance.score.toFixed(1)}/5` : '—',
          mda.reportGovResolution ? (mda.reportGovResolution.isSkipped ? '0/15 (Skipped)' : `${mda.reportGovResolution.score.toFixed(1)}/15`) : '—',
          mda.monthlyReport ? `${mda.monthlyReport.score.toFixed(1)}/3` : '—',
          mda.timeliness ? `${mda.timeliness.score.toFixed(1)}/2` : '—',
          mda.isReportGovSkipped 
            ? `${mda.totalPercentage.toFixed(1)}/100 Using 85%`
            : `${mda.totalScore.toFixed(1)}/100 (${mda.totalPercentage.toFixed(1)}%)`
        ]);
      } else {
        const displayValue = score > 0 
          ? (mda.isReportGovSkipped 
              ? `${overallPercentage.toFixed(1)}/100 Using 85%`
              : `${overallPercentage.toFixed(1)}%`)
          : '—';
        tableData.push([
          `#${rank}`,
          mda.mdaName,
          displayValue
        ]);
      }
    });

    // Create table
    if (selectedMetric === 'totalScore') {
      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'MDA Name', 'SLA', 'Mystery Shopping', 'Collaboration', 'Stakeholder', 'Report Gov', 'Report Gov Resolution', 'Monthly Report', 'Timeliness', 'Total Score']],
        body: tableData,
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: { fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2 },
        theme: 'striped',
        margin: { left: 10, right: 10 },
        didDrawPage: (data: any) => {
          // Add page numbers
          doc.setFontSize(10);
          doc.text(
            `Page ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      });
    } else {
      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'MDA Name', `${metricDisplayName} (%)`]],
        body: tableData,
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        styles: { fontSize: 9 },
        theme: 'striped',
        margin: { left: 10, right: 10 },
        didDrawPage: (data: any) => {
          // Add page numbers
          doc.setFontSize(10);
          doc.text(
            `Page ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      });
    }

    // Save PDF
    const fileName = `Dashboard_${metricDisplayName.replace(/[^a-z0-9]/gi, '_')}_${dashboardYear}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to download PDF");
  }
}

