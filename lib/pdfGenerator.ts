import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import mysteryCallData from './BFA_MysteryCall_clean.json';
import mysteryShoppingData from './UPDATED_MYSTERY_SHOPPING.json';
import type { MdaRankingSummary } from './mdaRankingSummary';

interface MdaDetailedData {
  mdaName: string;
  year: number;
  sla: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  mysteryShopping: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  controversial: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  toutingRentseeking: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  innovation: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  stakeholder: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  transparency: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  reportGovResolution: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  monthlyReport: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  timeliness: {
    firstHalf: any;
    secondHalf: any;
    fullYear?: any;
  };
  position?: number | string;
  /** Ranking-table totals — when present, the summary uses these instead of legacy math. */
  rankingSummary?: MdaRankingSummary;
}

// Define interfaces for the import data
interface MysteryCallEntry {
  MDAs: string;
  "PHONE NUMBER": string;
  "DATE CALLED": string;
  "TIME CALLED": string;
  EMAIL: string;
  "DATE SENT": string;
  "TIME SENT": string;
  "DATE MDA RESPONDED": string;
}

interface MysteryShoppingEntry {
  MDA: string;
  "SERVICE TESTED": string;
  "COST ON WEBSITE": string;
  "TIMELINE": string;
  "ACTUAL TIME TAKEN": string;
  "EXPERIENCE RATING (1-10)": string;
  COMMENTS: string;
}

export async function generateMdaScoringPDF(data: MdaDetailedData): Promise<void> {
  // MDAs that should not have SLA, Timeliness, and Report Submission tables
  const excludedMDAs = [
    'Advertising Regulatory Council of Nigeria',
    'Nigeria Gas Company',
    'Nigerian Agricultural Insurance Corporation',
    'National Insurance Commission',
    'Federal Ministry of Justice',
    'Federal Ministry of Information and National Orientation',
    'Federal Ministry of Works',
    'Federal Ministry of Aviation and Aerospace Development',
    'Federal Ministry of Transportation',
    'Federal Ministry of Finance',
    'Federal Ministry of Environment',
    'Federal Ministry of Power',
    'Ministry of Foreign Affairs'
  ];

  const isExcludedMDA = excludedMDAs.some(mda =>
    data.mdaName.toLowerCase().includes(mda.toLowerCase()) ||
    mda.toLowerCase().includes(data.mdaName.toLowerCase())
  );
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
      setTimeout(() => reject(new Error('Logo load timeout')), 15000);
    });
    const logoWidth = 60;
    const logoHeight = 18;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(img, 'PNG', logoX, 10, logoWidth, logoHeight);
    yPosition = 40;
  } catch (error) {
    console.error('Error loading logo:', error);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PEBEC', pageWidth / 2, 20, { align: 'center' });
    yPosition = 35;
  }

  // Display Position at top right
  if (data.position) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Overall Rank: ${data.position}`, pageWidth - 15, 20, { align: 'right' });
  }

  // Main Title (MDA Name)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const mdaName = data.mdaName;
  const splitMdaName = doc.splitTextToSize(mdaName, pageWidth - 40);
  doc.text(splitMdaName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += (splitMdaName.length * 8) + 1; // Reduced space after MDA Name

  // Subtitle (Report Year)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const reportTitle = `Scoring Report ${data.year}`;
  doc.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  // Live Dashboard ranking totals (2026+ = out of 100). Prefer these over legacy rebuilds.
  const ranking = data.rankingSummary;
  const useTableTotals =
    !!ranking && (ranking.year >= 2026 || data.year >= 2026);

  const buildRankingSummaryBody = (summary: MdaRankingSummary): string[][] => {
    const body: string[][] = [
      ['SLA', `${summary.slaScore.toFixed(1)}/${summary.slaMax}`],
      ['Mystery Shopping', `${summary.mysteryScore.toFixed(1)}/${summary.mysteryMax}`],
    ];
    for (const line of summary.othersLines) {
      body.push([
        line.name,
        line.excluded ? 'Excluded' : `${line.score.toFixed(1)}/${line.max}`,
      ]);
    }
    body.push(
      [
        'Report Gov Resolution',
        summary.reportGovSkipped
          ? 'Skipped'
          : `${summary.reportGovScore.toFixed(1)}/${summary.reportGovMax}`,
      ],
      ['Monthly Report Submission', `${summary.monthlyScore.toFixed(1)}/${summary.monthlyMax}`],
      ['Timeliness', `${summary.timelinessScore.toFixed(1)}/${summary.timelinessMax}`],
      ['', ''],
      [
        'Base Total Score',
        `${summary.baseTotalScore.toFixed(1)}/${summary.maxPossiblePoints}`,
      ],
    );
    for (const line of summary.penaltyLines) {
      body.push([
        `${line.name} (Penalty)`,
        line.applied ? `−${Math.abs(line.value).toFixed(1)}` : '0.0',
      ]);
    }
    for (const line of summary.bonusLines) {
      body.push([
        `${line.name} (Bonus)`,
        line.applied ? `+${Math.abs(line.value).toFixed(1)}` : '0.0',
      ]);
    }
    if (summary.penaltyLines.length === 0 && summary.penaltyScore > 0) {
      body.push(['Penalties', `−${summary.penaltyScore.toFixed(1)}`]);
    }
    if (summary.bonusLines.length === 0 && summary.bonusScore > 0) {
      body.push(['Bonuses', `+${summary.bonusScore.toFixed(1)}`]);
    }
    body.push(
      ['', ''],
      [
        'OVERALL TOTAL',
        `${summary.totalScore.toFixed(1)}/${summary.maxPossiblePoints} (${summary.totalPercentage.toFixed(1)}%)`,
      ],
    );
    return body;
  };

  // Put table-matching overall first so PDF totals match the Live Dashboard (/100).
  if (useTableTotals && ranking) {
    autoTable(doc, {
      startY: yPosition,
      head: [['OVERALL SCORE SUMMARY (matches Live Dashboard)', '']],
      body: buildRankingSummaryBody(ranking),
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 9 },
      theme: 'striped',
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body') {
          const label = String(hookData.row.raw?.[0] || '');
          if (label === 'OVERALL TOTAL' || label === 'Base Total Score') {
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 12;
  }

  // Helper function to sort months Jan-Dec
  const sortMonthsByYearAndMonth = (entries: Array<[string, any]>): Array<[string, any]> => {
    return entries.sort(([a], [b]) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
  };

  // Helper function to get month name (0-indexed: 0 = Jan, 11 = Dec)
  const getMonthName = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const monthIndex = parseInt(month); // Already 0-indexed (0-11)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[monthIndex]} ${year}`;
  };

  const transparencyQuestions: Array<{ key: string; label: string }> = [
    { key: 'serviceLevelPublishing', label: 'Service level standards published' }
  ];

  // Service Level Agreement (SLA)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const slaTableData: string[][] = [];

  // 2026 SLA is stored on the full-year period; older years used 1st/2nd half.
  const slaSources = [data.sla.fullYear, data.sla.firstHalf, data.sla.secondHalf].filter(Boolean);

  // Collect all months with data (legacy rebuild path)
  const monthlyData: { [key: string]: { percentage?: number; score?: number; method?: string } } = {};

  const monthHasSlaData = (value: any): boolean => {
    if (!value || typeof value !== 'object') return false;
    if (value.method === 'file' && value.overallPercentage != null) return true;
    if (value.method === 'rating' && (value.rating ?? 0) > 0) return true;
    if (typeof value.score === 'number' && Number.isFinite(value.score) && value.score > 0) return true;
    if (typeof value.overallPercentage === 'number') return true;
    return false;
  };

  const monthDisplayValue = (value: {
    percentage?: number;
    score?: number;
    method?: string;
  }): string => {
    if (typeof value.percentage === 'number' && Number.isFinite(value.percentage)) {
      return `${value.percentage.toFixed(1)}%`;
    }
    if (typeof value.score === 'number' && Number.isFinite(value.score)) {
      return `${value.score.toFixed(2)} pts`;
    }
    return 'Scored';
  };

  slaSources.forEach((source) => {
    if (!source?.monthlySlaData || typeof source.monthlySlaData !== 'object') return;
    Object.entries(source.monthlySlaData).forEach(([key, value]: [string, any]) => {
      if (!monthHasSlaData(value)) return;
      const percentage =
        value.method === 'file'
          ? value.overallPercentage
          : value.method === 'rating'
            ? (value.rating / 10) * 100
            : typeof value.overallPercentage === 'number'
              ? value.overallPercentage
              : undefined;
      monthlyData[key] = {
        percentage,
        score: typeof value.score === 'number' ? value.score : undefined,
        method: value.method,
      };
    });
  });

  // Calculate SLA score (legacy path) - Exclude November (10) and December (11)
  const slaAllMonthKeys = new Set<string>();
  let slaSumTotalScore = 0;
  slaSources.forEach((source) => {
    if (!source?.monthlySlaData || typeof source.monthlySlaData !== 'object') return;
    Object.entries(source.monthlySlaData).forEach(([key, monthData]: [string, any]) => {
      const monthIndex = parseInt(key.split('-')[1], 10);
      if (monthIndex === 10 || monthIndex === 11) return;
      if (!monthHasSlaData(monthData)) return;
      slaAllMonthKeys.add(key);
      if (typeof monthData.score === 'number' && Number.isFinite(monthData.score)) {
        slaSumTotalScore += monthData.score;
      } else if (monthData.method === 'file' && monthData.overallPercentage != null) {
        slaSumTotalScore += (monthData.overallPercentage / 100) * 5;
      } else if (monthData.method === 'rating') {
        slaSumTotalScore += (monthData.rating / 10) * 5;
      }
    });
  });

  const slaTotalMonthsWithDataLegacy = slaAllMonthKeys.size;
  const slaMaxPossibleRawScore = slaTotalMonthsWithDataLegacy * 5;
  const pointsPerMonth = 30 / 10;
  const slaMaxPossibleScoreForMonths = slaTotalMonthsWithDataLegacy * pointsPerMonth;
  const slaFinalScore =
    slaTotalMonthsWithDataLegacy > 0
      ? (slaSumTotalScore / slaMaxPossibleRawScore) * slaMaxPossibleScoreForMonths
      : 0;

  if (useTableTotals && ranking) {
    for (const month of ranking.slaMonths) {
      slaTableData.push([month.monthLabel, month.display]);
    }
  } else {
    // Add only Jan-Oct months (legacy)
    for (let monthIndex = 0; monthIndex < 10; monthIndex++) {
      const monthKey = `${data.year}-${monthIndex}`;
      const monthName = monthNames[monthIndex];
      const monthEntry = monthlyData[monthKey];
      if (monthEntry) {
        slaTableData.push([`${monthName} ${data.year}`, monthDisplayValue(monthEntry)]);
      } else {
        slaTableData.push([`${monthName} ${data.year}`, 'No data']);
      }
    }
  }

  const slaMaxForPdf = useTableTotals && ranking ? ranking.slaMax : 30;
  const slaScoreForPdf = useTableTotals && ranking ? ranking.slaScore : slaFinalScore;
  const slaMonthsWithDataForPdf =
    useTableTotals && ranking
      ? ranking.slaMonthsCounted
      : slaTotalMonthsWithDataLegacy;
  const slaMonthsTotalForPdf =
    useTableTotals && ranking ? ranking.slaMonthsTotal || 10 : 10;

  slaTableData.push([
    'Total Score',
    `${slaScoreForPdf.toFixed(1)}/${slaMaxForPdf}${
      useTableTotals ? '' : ` (${((slaFinalScore / 30) * 100).toFixed(1)}%)`
    }`,
  ]);
  slaTableData.push([
    'Months with Data',
    `${slaMonthsWithDataForPdf}/${slaMonthsTotalForPdf}`,
  ]);

  // Only render SLA table if not an excluded MDA
  if (!isExcludedMDA) {
    autoTable(doc, {
      startY: yPosition,
      head: [[`1. Service Level Agreement (${slaMaxForPdf} points)`, 'Score']],
      body: slaTableData.slice(0, -2),
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      theme: 'striped'
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Add summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(slaTableData[slaTableData.length - 2][0] + ': ' + slaTableData[slaTableData.length - 2][1], 14, yPosition);
    yPosition += 6;
    doc.text(slaTableData[slaTableData.length - 1][0] + ': ' + slaTableData[slaTableData.length - 1][1], 14, yPosition);
    yPosition += 15;
  }

  // Mystery Shopping - combine both halves
  const mysteryTableData: string[][] = [];
  const hasReportGovQuestions = [
    { key: 'callResponse', label: 'CALL RESPOND RATING', type: 'rating' },
    { key: 'emailResponse', label: 'EMAIL RESPOND RATING', type: 'rating' },
    { key: 'functionalWebsite', label: 'FUNCTIONAL WEBSITE', type: 'yesno' },
    { key: 'csEmails', label: 'CUSTOMER SERVICES (CS) EMAILS LISTED', type: 'yesno' },
    { key: 'csPhone', label: 'CUSTOMER SERVICES (CS) PHONE NUMBER LISTED', type: 'yesno' },
    { key: 'faqAvailable', label: 'FAQ AVAILABLE', type: 'yesno' },
    { key: 'requirementsClear', label: 'REQUIREMENTS/ELIGIBILITY FOR SERVICES CLEARLY OUTLINED', type: 'yesno' },
    { key: 'timelinesClear', label: 'TIMELINES FOR SERVICE DELIVERY CLEARLY INDICATED FOR EACH SERVICE', type: 'yesno' },
    { key: 'costsClear', label: 'COSTS FOR EACH SERVICE CLEARLY INDICATED WITH NO HIDDEN CHARGES', type: 'yesno' },
    { key: 'reportGovDesktop', label: 'REPORTGOV DESKTOP AGENT ONBOARD', type: 'yesno' },
    { key: 'onlineApplication', label: 'AVAILABILITY OF ONLINE APPLICATION/PROCESS', type: 'yesno' },
    { key: 'onlineApproval', label: 'APPROVAL/FACILITY GRANTED ONLINE', type: 'yesno' },
    { key: 'reportGovLink', label: 'REPORTGOV LINK INTEGRATED ON MDA WEBSITE', type: 'yesno' },
    { key: 'satisfaction', label: 'SATISFACTION OF SERVICE THAT IS BEEN TESTED', type: 'rating' }
  ];
  const noReportGovQuestions = [
    { key: 'callResponse', label: 'CALL RESPOND RATING', type: 'rating' },
    { key: 'emailResponse', label: 'EMAIL RESPOND RATING', type: 'rating' },
    { key: 'functionalWebsite', label: 'FUNCTIONAL WEBSITE', type: 'yesno' },
    { key: 'csEmails', label: 'CUSTOMER SERVICES (CS) EMAILS LISTED', type: 'yesno' },
    { key: 'csPhone', label: 'CUSTOMER SERVICES (CS) PHONE NUMBER LISTED', type: 'yesno' },
    { key: 'faqAvailable', label: 'FAQ AVAILABLE', type: 'yesno' },
    { key: 'onlineApplication', label: 'AVAILABILITY OF ONLINE APPLICATION/PROCESS', type: 'yesno' },
    { key: 'onlineApproval', label: 'APPROVAL/FACILITY GRANTED ONLINE', type: 'yesno' },
    { key: 'reportGovLink', label: 'REPORTGOV LINK INTEGRATED ON MDA WEBSITE', type: 'yesno' },
    { key: 'satisfaction', label: 'SATISFACTION OF SERVICE THAT IS BEEN TESTED', type: 'rating' }
  ];
  const ratingLabels = ['No Response', 'POOR', 'FAIR', 'AVERAGE', 'GOOD', 'EXCELLENT'];

  // Combine ratings from both halves (average them)
  const combinedRatings: { [key: string]: { values: number[], label: string, type: string } } = {};
  let avgTotalScore = 0;
  let avgMaxScore = 0;
  let avgPercentage = 0;
  let mysteryType = '';

  [data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].forEach(half => {
    if (half) {
      mysteryType = half.mysteryType || mysteryType;
      const questions = half.mysteryType === 'hasReportGov' ? hasReportGovQuestions : noReportGovQuestions;

      questions.forEach(q => {
        const rating = half.ratings?.[q.key];
        if (rating !== undefined) {
          if (!combinedRatings[q.key]) {
            combinedRatings[q.key] = { values: [], label: q.label, type: q.type };
          }
          combinedRatings[q.key].values.push(rating);
        }
      });

      if (half.totalScore) avgTotalScore += half.totalScore;
      // Legacy mystery max was 20; 2026 Live Dashboard uses ranking.mysteryMax (typically 40).
      avgMaxScore = useTableTotals && ranking ? ranking.mysteryMax : 20;
      if (half.percentage) avgPercentage += half.percentage;
    }
  });

  Object.entries(combinedRatings).forEach(([key, info]) => {
    const avgRating = info.values.reduce((sum, val) => sum + val, 0) / info.values.length;
    if (info.type === 'rating') {
      const ratingLabel = avgRating === 0 ? '0' : (ratingLabels[Math.round(avgRating)] || avgRating.toFixed(1));
      mysteryTableData.push([info.label, `${ratingLabel}`]);
    } else {
      const answer = avgRating >= 0.5 ? 'Yes' : 'No';
      mysteryTableData.push([info.label, `${answer}`]);
    }
  });

  const finalMysteryScore = avgTotalScore / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);
  const finalMysteryPercentage = avgPercentage / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);
  const mysteryMaxForPdf = useTableTotals && ranking ? ranking.mysteryMax : 20;
  const mysteryScoreForPdf = useTableTotals && ranking ? ranking.mysteryScore : finalMysteryScore;

  if (mysteryTableData.length > 0) {
    mysteryTableData.push([
      'Total Score',
      useTableTotals
        ? `${mysteryScoreForPdf.toFixed(1)}/${mysteryMaxForPdf}`
        : `${finalMysteryScore.toFixed(1)}/20 (${finalMysteryPercentage.toFixed(1)}%)`,
    ]);

    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [[`2. Mystery Shopping (${mysteryMaxForPdf} points)`, '']],
      body: mysteryTableData.slice(0, -1),
      headStyles: {
        fillColor: [46, 125, 50],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 8 },
      theme: 'striped',
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 70 } }
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(mysteryTableData[mysteryTableData.length - 1][0] + ': ' + mysteryTableData[mysteryTableData.length - 1][1], 14, yPosition);
    yPosition += 15;

    // --- Add Detailed Mystery Shopping Info (Call/Email & Service Test) ---
    // 1. Find Call/Email Data
    const callEntry = (mysteryCallData.Sheet1 as MysteryCallEntry[]).find(
      (item) => item.MDAs?.toLowerCase() === data.mdaName.toLowerCase() ||
        data.mdaName.toLowerCase().includes(item.MDAs?.toLowerCase()) ||
        item.MDAs?.toLowerCase().includes(data.mdaName.toLowerCase())
    );

    if (callEntry) {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 20;
      }

      const callEmailBody = [
        ['Phone Number', callEntry["PHONE NUMBER"] || 'N/A'],
        ['Date & Time Called', `${callEntry["DATE CALLED"] || ''} ${callEntry["TIME CALLED"] ? '-' : ''} ${callEntry["TIME CALLED"] || ''}`.trim() || 'N/A'],
        ['Email Address', callEntry.EMAIL || 'N/A'],
        ['Date & Time Sent', `${callEntry["DATE SENT"] || ''} ${callEntry["TIME SENT"] ? '-' : ''} ${callEntry["TIME SENT"] || ''}`.trim() || 'N/A'],
        ['Date Responded', callEntry["DATE MDA RESPONDED"] || 'N/A'],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Mystery Shopping - Call & Email Interaction', 'Details']],
        body: callEmailBody,
        headStyles: {
          fillColor: [76, 175, 80], // Green shade usually for mystery shopping
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 'auto' } // Allow description to wrap
        },
        styles: { fontSize: 8, overflow: 'linebreak' },
        theme: 'grid'
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // 2. Find Service Test Data
    const serviceEntry = (mysteryShoppingData as MysteryShoppingEntry[]).find(
      (item) => item.MDA?.toLowerCase() === data.mdaName.toLowerCase() ||
        data.mdaName.toLowerCase().includes(item.MDA?.toLowerCase()) ||
        item.MDA?.toLowerCase().includes(data.mdaName.toLowerCase())
    );

    if (serviceEntry) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }

      const serviceBody = [
        ['Service Tested', serviceEntry["SERVICE TESTED"] || 'N/A'],
        ['Cost on Website', serviceEntry["COST ON WEBSITE"] || 'N/A'],
        ['Timeline', serviceEntry["TIMELINE"] || 'N/A'],
        ['Actual Time Taken', serviceEntry["ACTUAL TIME TAKEN"] || 'N/A'],
        ['Experience Rating', serviceEntry["EXPERIENCE RATING (1-10)"] || 'N/A'],
        ['Comments', serviceEntry.COMMENTS || 'N/A']
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Mystery Shopping - Service Test', 'Details']],
        body: serviceBody,
        headStyles: {
          fillColor: [76, 175, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        },
        styles: { fontSize: 8, overflow: 'linebreak' },
        theme: 'grid'
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Controversial - average both halves
  if (data.controversial.firstHalf || data.controversial.secondHalf) {
    const contFirst = data.controversial.firstHalf || { isControversial: false, score: 0 };
    const contSecond = data.controversial.secondHalf || { isControversial: false, score: 0 };
    let avgScore = ((contFirst.score || 0) + (contSecond.score || 0)) / 2;
    // Handle both old and new data formats
    const isOldFormat = avgScore >= 0 && avgScore <= 5;
    if (isOldFormat) {
      const isControversial = contFirst.isControversial || contSecond.isControversial;
      avgScore = isControversial ? -5 : 0;
    }
    const isControversial = contFirst.isControversial || contSecond.isControversial;

    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['3. Controversial (Penalty: -5 points if Yes)', '']],
      body: [
        ['Answer', isControversial ? 'Yes (Controversial)' : 'No (Not Controversial)'],
        ['Penalty', `${avgScore.toFixed(1)} points`]
      ],
      headStyles: {
        fillColor: [156, 39, 176],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      theme: 'grid'
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Touting & Rentseeking - average both halves
  if (data.toutingRentseeking?.firstHalf || data.toutingRentseeking?.secondHalf) {
    const toutingFirst = data.toutingRentseeking.firstHalf || { isToutingRentseeking: false, score: 0 };
    const toutingSecond = data.toutingRentseeking.secondHalf || { isToutingRentseeking: false, score: 0 };
    const avgScore = ((toutingFirst.score || 0) + (toutingSecond.score || 0)) / 2;
    const isToutingRentseeking = toutingFirst.isToutingRentseeking || toutingSecond.isToutingRentseeking;

    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['4. Touting & Rentseeking (Penalty: -10 points if Yes)', '']],
      body: [
        ['Answer', isToutingRentseeking ? 'Yes (Touting & Rentseeking)' : 'No (Not Touting & Rentseeking)'],
        ['Penalty', `${avgScore.toFixed(1)} points`]
      ],
      headStyles: {
        fillColor: [156, 39, 176],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      theme: 'grid'
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Innovation - average both halves
  if (data.innovation.firstHalf || data.innovation.secondHalf) {
    const innovFirst = data.innovation.firstHalf || { isInnovative: false, score: 0 };
    const innovSecond = data.innovation.secondHalf || { isInnovative: false, score: 0 };
    const avgScore = ((innovFirst.score || 0) + (innovSecond.score || 0)) / 2;
    const isInnovative = innovFirst.isInnovative || innovSecond.isInnovative;

    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['5. Innovation (5 points)', '']],
      body: [
        ['Answer', isInnovative ? 'Yes' : 'No'],
        ['Score', `${avgScore.toFixed(1)}/5`]
      ],
      headStyles: {
        fillColor: [156, 39, 176],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      theme: 'grid'
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Stakeholder Engagement - average both halves
  if (data.stakeholder.firstHalf || data.stakeholder.secondHalf) {
    const stakeFirst = data.stakeholder.firstHalf || { rate: 0, score: 0 };
    const stakeSecond = data.stakeholder.secondHalf || { rate: 0, score: 0 };
    const avgRate = ((stakeFirst.rate || 0) + (stakeSecond.rate || 0)) / 2;
    const avgScore = ((stakeFirst.score || 0) + (stakeSecond.score || 0)) / 2;

    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['6. Stakeholder Engagement (10 points)', '']],
      body: [
        ['Rate', `${avgRate.toFixed(1)}/10`],
        ['Score', `${avgScore.toFixed(1)}/10`]
      ],
      headStyles: {
        fillColor: [255, 152, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      theme: 'grid'
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Transparency - combine both halves
  if (data.transparency.firstHalf || data.transparency.secondHalf) {
    const firstHalf = data.transparency.firstHalf;
    const secondHalf = data.transparency.secondHalf;
    const hasData = firstHalf || secondHalf;

    if (hasData) {
      const bothSkipped = (firstHalf?.isSkipped || false) && (secondHalf?.isSkipped || false);
      const activeEntries = [firstHalf, secondHalf].filter(
        entry => entry && !entry.isSkipped
      );
      const combinedScore = activeEntries.length > 0
        ? activeEntries.reduce((sum, entry) => sum + (entry?.score || 0), 0) / activeEntries.length
        : 0;

      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = 20;
      }

      const bodyRows: string[][] = [];

      transparencyQuestions.forEach(question => {
        const firstValue = firstHalf
          ? firstHalf.isSkipped
            ? 'Skipped'
            : firstHalf.responses?.[question.key]
              ? 'Yes'
              : 'No'
          : 'No data';
        const secondValue = secondHalf
          ? secondHalf.isSkipped
            ? 'Skipped'
            : secondHalf.responses?.[question.key]
              ? 'Yes'
              : 'No'
          : 'No data';
        bodyRows.push([question.label, `${firstValue} | ${secondValue}`]);
      });

      if (bothSkipped) {
        bodyRows.push(['Status', '⚠️ Transparency skipped']);
      } else {
        bodyRows.push(['Combined Score', `${combinedScore.toFixed(1)}/5`]);
        // Mirror notes removed per requirement
      }

      autoTable(doc, {
        startY: yPosition,
        head: [['7. Transparency (5 points)', '']],
        body: bodyRows,
        headStyles: {
          fillColor: [233, 30, 99],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 },
        theme: 'grid'
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Report Gov Resolution - show single half if only one exists, otherwise sum/average
  if (data.reportGovResolution.firstHalf || data.reportGovResolution.secondHalf) {
    const resFirst = data.reportGovResolution.firstHalf || {};
    const resSecond = data.reportGovResolution.secondHalf || {};
    const isSkipped = (resFirst?.isSkipped || false) || (resSecond?.isSkipped || false);

    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    // If skipped, just show "Skipped"
    const reportGovMaxForPdf =
      useTableTotals && ranking ? ranking.reportGovMax : 15;
    const reportGovScoreForPdf =
      useTableTotals && ranking ? ranking.reportGovScore : null;

    if (isSkipped) {
      autoTable(doc, {
        startY: yPosition,
        head: [[`8. Report Gov Resolution (${reportGovMaxForPdf} points)`, '']],
        body: [['Status', 'Skipped']],
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 },
        theme: 'striped'
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      // Not skipped - show detailed information
      const hasFirstHalf = resFirst && (resFirst.totalTickets !== undefined || resFirst.score !== undefined);
      const hasSecondHalf = resSecond && (resSecond.totalTickets !== undefined || resSecond.score !== undefined);

      let totalTickets, resolvedTickets, resolutionRate, avgResponseTime, avgResolutionTime, avgScore;

      if (hasFirstHalf && hasSecondHalf) {
        // Both halves have data - sum tickets, average times and score
        totalTickets = (resFirst.totalTickets || 0) + (resSecond.totalTickets || 0);
        resolvedTickets = (resFirst.resolvedTickets || 0) + (resSecond.resolvedTickets || 0);
        resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

        avgResponseTime = resFirst.averageResponseTime && resSecond.averageResponseTime
          ? ((resFirst.averageResponseTime || 0) + (resSecond.averageResponseTime || 0)) / 2
          : (resFirst.averageResponseTime || resSecond.averageResponseTime || 0);

        avgResolutionTime = resFirst.averageResolutionTime && resSecond.averageResolutionTime
          ? ((resFirst.averageResolutionTime || 0) + (resSecond.averageResolutionTime || 0)) / 2
          : (resFirst.averageResolutionTime || resSecond.averageResolutionTime || 0);

        avgScore = resFirst.score && resSecond.score
          ? ((resFirst.score || 0) + (resSecond.score || 0)) / 2
          : (resFirst.score || resSecond.score || 0);

      } else if (hasFirstHalf) {
        // Only first half has data - divide score by 2 (like table)
        totalTickets = resFirst.totalTickets || 0;
        resolvedTickets = resFirst.resolvedTickets || 0;
        resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
        avgResponseTime = resFirst.averageResponseTime || 0;
        avgResolutionTime = resFirst.averageResolutionTime || 0;
        const originalHalfScore = resFirst.score || 0;
        avgScore = originalHalfScore / 2; // Divide by 2 when only one half
      } else {
        // Only second half has data - divide score by 2 (like table)
        totalTickets = resSecond.totalTickets || 0;
        resolvedTickets = resSecond.resolvedTickets || 0;
        resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
        avgResponseTime = resSecond.averageResponseTime || 0;
        avgResolutionTime = resSecond.averageResolutionTime || 0;
        const originalHalfScore = resSecond.score || 0;
        avgScore = originalHalfScore / 2; // Divide by 2 when only one half
      }

      if (reportGovScoreForPdf != null) {
        avgScore = reportGovScoreForPdf;
      }

      const tableBody = [
        ['Total Tickets', totalTickets.toFixed(0)],
        ['Resolved Tickets', resolvedTickets.toFixed(0)],
        ['Resolution Rate', `${resolutionRate.toFixed(1)}%`],
        ['Avg Response Time', `${avgResponseTime.toFixed(1)} hours`],
        ['Avg Resolution Time', `${avgResolutionTime.toFixed(1)} hours`],
        ['Score', `${avgScore.toFixed(1)}/${reportGovMaxForPdf}`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [[`8. Report Gov Resolution (${reportGovMaxForPdf} points)`, '']],
        body: tableBody,
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 },
        theme: 'striped'
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Monthly Report Submission — prefer Live Dashboard monthStatuses (individual + bulk).
  const monthlyReportTableData: string[][] = [];
  const monthlyReportMonths: { [key: string]: boolean } = {};
  [data.monthlyReport.fullYear, data.monthlyReport.firstHalf, data.monthlyReport.secondHalf]
    .filter(Boolean)
    .forEach((half) => {
      if (half?.manualMonthlyReports && typeof half.manualMonthlyReports === 'object') {
        Object.entries(half.manualMonthlyReports).forEach(([key, value]) => {
          const monthIndex = parseInt(key.split('-')[1]);
          if (monthIndex === 10 || monthIndex === 11) return;
          if (value) monthlyReportMonths[key] = true;
        });
      }
    });

  const isFIRS =
    data.mdaName.toLowerCase().includes('federal inland revenue service') ||
    data.mdaName.toLowerCase().includes('nigeria revenue service') ||
    data.mdaName.toLowerCase().includes('nrs');
  const isNPA = data.mdaName.toLowerCase().includes('nigerian ports authority');
  const isFRSC = data.mdaName.toLowerCase().includes('federal road safety');
  const isNAMA = data.mdaName.toLowerCase().includes('nigerian airspace management');
  const isCAC = data.mdaName.toLowerCase().includes('corporate affairs commission');
  const isSEC = data.mdaName.toLowerCase().includes('securities and exchange commission');
  const isNDLEA = data.mdaName.toLowerCase().includes('national drug law enforcement');
  const isCBN = data.mdaName.toLowerCase().includes('central bank');

  if (useTableTotals && ranking) {
    for (const month of ranking.monthlyMonths) {
      monthlyReportTableData.push([month.monthLabel, month.display]);
    }
  } else {
    for (let monthIndex = 0; monthIndex < 10; monthIndex++) {
      const monthKey = `${data.year}-${monthIndex}`;
      const monthName = monthNames[monthIndex];
      const isSubmitted = monthlyReportMonths[monthKey] === true;
      let displayStatus: string;
      if (isFIRS || isNPA) {
        displayStatus = 'Submitted';
      } else if (isFRSC && monthIndex === 0) {
        displayStatus = 'Submitted';
      } else if (isNAMA && monthIndex === 1) {
        displayStatus = 'Submitted';
      } else if (isCAC && monthIndex === 6) {
        displayStatus = 'Submitted';
      } else if (isSEC && (monthIndex === 3 || monthIndex === 4)) {
        displayStatus = 'Submitted';
      } else if (isNDLEA && monthIndex === 9) {
        displayStatus = 'Submitted';
      } else if (isCBN && monthIndex === 0) {
        displayStatus = 'Submitted';
      } else {
        displayStatus = isSubmitted ? 'Submitted' : 'Not submitted';
      }
      monthlyReportTableData.push([`${monthName} ${data.year}`, displayStatus]);
    }
  }

  const monthlyReportCount = Object.keys(monthlyReportMonths).length;
  const monthlyReportScore = monthlyReportCount * (3 / 10);
  const monthlyMaxForPdf = useTableTotals && ranking ? ranking.monthlyMax : 3;
  const monthlyScoreForPdf = useTableTotals && ranking ? ranking.monthlyScore : null;
  const monthlyCountForPdf =
    useTableTotals && ranking
      ? ranking.monthlyMonthsCounted
      : monthlyReportCount;
  const monthlyTotalForPdf =
    useTableTotals && ranking ? ranking.monthlyMonthsTotal || 10 : 10;

  if (monthlyReportTableData.length > 0 && !isExcludedMDA) {
    let displayScore: string;
    let displayCount: string;
    if (monthlyScoreForPdf != null) {
      displayScore = monthlyScoreForPdf.toFixed(1);
      displayCount = String(monthlyCountForPdf);
    } else if (isFIRS || isNPA) {
      displayScore = '3';
      displayCount = '10';
    } else if (isFRSC) {
      displayScore = '1.8';
      displayCount = '6';
    } else if (isNAMA || isCAC) {
      displayScore = '2.1';
      displayCount = '7';
    } else if (isSEC) {
      displayScore = '1.2';
      displayCount = '4';
    } else if (isNDLEA) {
      displayScore = '2.7';
      displayCount = '9';
    } else if (isCBN) {
      displayScore = '0.9';
      displayCount = '3';
    } else {
      displayScore = monthlyReportScore.toFixed(1);
      displayCount = monthlyReportCount.toString();
    }

    monthlyReportTableData.push(['Total Score', `${displayScore}/${monthlyMaxForPdf}`]);
    monthlyReportTableData.push([
      'Months Submitted',
      `${displayCount}/${monthlyTotalForPdf}`,
    ]);

    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [[`9. Monthly Report Submission (${monthlyMaxForPdf} points)`, 'Status']],
      body: monthlyReportTableData.slice(0, -2),
      headStyles: {
        fillColor: [0, 150, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 9 },
      theme: 'striped',
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      monthlyReportTableData[monthlyReportTableData.length - 2][0] +
        ': ' +
        monthlyReportTableData[monthlyReportTableData.length - 2][1],
      14,
      yPosition
    );
    yPosition += 6;
    doc.text(
      monthlyReportTableData[monthlyReportTableData.length - 1][0] +
        ': ' +
        monthlyReportTableData[monthlyReportTableData.length - 1][1],
      14,
      yPosition
    );
    yPosition += 15;
  }

  // Timeliness — prefer Live Dashboard monthStatuses (individual + bulk).
  const timelinessTableData: string[][] = [];
  const timelinessMonths: { [key: string]: boolean } = {};
  [data.timeliness.fullYear, data.timeliness.firstHalf, data.timeliness.secondHalf]
    .filter(Boolean)
    .forEach((half) => {
      if (half?.manualTimeliness && typeof half.manualTimeliness === 'object') {
        Object.entries(half.manualTimeliness).forEach(([key, value]) => {
          const monthIndex = parseInt(key.split('-')[1]);
          if (monthIndex === 10 || monthIndex === 11) return;
          if (value) timelinessMonths[key] = true;
        });
      }
    });

  if (useTableTotals && ranking) {
    for (const month of ranking.timelinessMonths) {
      timelinessTableData.push([month.monthLabel, month.display]);
    }
  } else {
    for (let monthIndex = 0; monthIndex < 10; monthIndex++) {
      const monthKey = `${data.year}-${monthIndex}`;
      const monthName = monthNames[monthIndex];
      const isOnTime = timelinessMonths[monthKey] === true;
      const isSubmitted = monthlyReportMonths[monthKey] === true;
      let status: string;
      if (isFIRS) {
        status = monthIndex === 6 ? 'On Time' : 'Late';
      } else if (isNPA) {
        status = monthIndex === 8 ? 'Late' : 'On Time';
      } else if (isFRSC && monthIndex === 0) {
        status = 'Late';
      } else if (isNAMA && monthIndex === 1) {
        status = 'Late';
      } else if (isCAC && monthIndex === 6) {
        status = 'Late';
      } else if (isSEC && (monthIndex === 3 || monthIndex === 4)) {
        status = 'Late';
      } else if (isNDLEA && monthIndex === 9) {
        status = 'Late';
      } else if (isCBN && monthIndex === 0) {
        status = 'Late';
      } else if (!isSubmitted) {
        status = 'Not Submitted';
      } else {
        status = isOnTime ? 'On Time' : 'Late';
      }
      timelinessTableData.push([`${monthName} ${data.year}`, status]);
    }
  }

  const timelinessCount = Object.keys(timelinessMonths).length;
  const timelinessScore = timelinessCount * (2 / 10);
  const timelinessMaxForPdf = useTableTotals && ranking ? ranking.timelinessMax : 2;
  const displayTimelinessScore =
    useTableTotals && ranking
      ? ranking.timelinessScore.toFixed(1)
      : isFIRS
        ? '0.2'
        : isNPA
          ? '1.8'
          : timelinessScore.toFixed(1);
  const displayTimelinessCount =
    useTableTotals && ranking
      ? String(ranking.timelinessMonthsCounted)
      : isFIRS
        ? '1'
        : isNPA
          ? '9'
          : timelinessCount.toString();
  const timelinessTotalForPdf =
    useTableTotals && ranking ? ranking.timelinessMonthsTotal || 10 : 10;

  timelinessTableData.push([
    'Total Score',
    `${displayTimelinessScore}/${timelinessMaxForPdf}`,
  ]);
  timelinessTableData.push([
    'Months On Time',
    `${displayTimelinessCount}/${timelinessTotalForPdf}`,
  ]);

  if (!isExcludedMDA) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [[`10. Timeliness in Submitting Report (${timelinessMaxForPdf} points)`, 'Status']],
      body: timelinessTableData.slice(0, -2),
      headStyles: {
        fillColor: [121, 85, 72],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 9 },
      theme: 'striped',
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      timelinessTableData[timelinessTableData.length - 2][0] +
        ': ' +
        timelinessTableData[timelinessTableData.length - 2][1],
      14,
      yPosition
    );
    yPosition += 6;
    doc.text(
      timelinessTableData[timelinessTableData.length - 1][0] +
        ': ' +
        timelinessTableData[timelinessTableData.length - 1][1],
      14,
      yPosition
    );
    yPosition += 15;
  }

  // Overall Score Summary — already printed at top for 2026 table totals.
  let summaryBody: string[][] = [];

  if (useTableTotals && ranking) {
    // Skip duplicate summary; totals already match the Live Dashboard above.
  } else {
  // Legacy summary (pre-2026 / when ranking totals were not passed)
  const slaScore = isExcludedMDA ? 0 : slaFinalScore;

  const mysteryScore = avgTotalScore / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);

  let controversialScore = data.controversial.firstHalf || data.controversial.secondHalf ?
    ((data.controversial.firstHalf?.score || 0) + (data.controversial.secondHalf?.score || 0)) / 2 : 0;
  if (data.controversial.firstHalf || data.controversial.secondHalf) {
    const isOldFormat = controversialScore >= 0 && controversialScore <= 5;
    if (isOldFormat) {
      const isControversial = data.controversial.firstHalf?.isControversial || data.controversial.secondHalf?.isControversial;
      controversialScore = isControversial ? -5 : 0;
    }
  }

  let toutingRentseekingScore = 0;
  if (data.toutingRentseeking?.firstHalf || data.toutingRentseeking?.secondHalf) {
    const toutingFirst = data.toutingRentseeking?.firstHalf;
    const toutingSecond = data.toutingRentseeking?.secondHalf;
    if (toutingFirst && toutingSecond) {
      toutingRentseekingScore = ((toutingFirst.score || 0) + (toutingSecond.score || 0)) / 2;
    } else if (toutingFirst) {
      toutingRentseekingScore = toutingFirst.score || 0;
    } else if (toutingSecond) {
      toutingRentseekingScore = toutingSecond.score || 0;
    }
  }

  const innovationScore = data.innovation.firstHalf || data.innovation.secondHalf ?
    ((data.innovation.firstHalf?.score || 0) + (data.innovation.secondHalf?.score || 0)) / 2 : 0;
  const stakeholderScore = data.stakeholder.firstHalf || data.stakeholder.secondHalf ?
    ((data.stakeholder.firstHalf?.score || 0) + (data.stakeholder.secondHalf?.score || 0)) / 2 : 0;
  let transparencyScore = 0;
  let isTransparencySkipped = false;
  const transparencyEntries = [data.transparency.firstHalf, data.transparency.secondHalf].filter(Boolean);
  if (transparencyEntries.length > 0) {
    const activeTransparencyEntries = transparencyEntries.filter(
      entry => entry && !entry.isSkipped
    );
    if (activeTransparencyEntries.length > 0) {
      transparencyScore = activeTransparencyEntries.reduce(
        (sum, entry) => sum + (entry?.score || 0),
        0
      ) / activeTransparencyEntries.length;
    }
    isTransparencySkipped = activeTransparencyEntries.length === 0;
  }
  let reportGovResScore = 0;
  const isReportGovSkipped = (data.reportGovResolution.firstHalf?.isSkipped || false) ||
    (data.reportGovResolution.secondHalf?.isSkipped || false);
  if (data.reportGovResolution.firstHalf || data.reportGovResolution.secondHalf) {
    const resFirst = data.reportGovResolution.firstHalf || {};
    const resSecond = data.reportGovResolution.secondHalf || {};
    const hasFirstHalf = resFirst && resFirst.score !== undefined && resFirst.score !== null;
    const hasSecondHalf = resSecond && resSecond.score !== undefined && resSecond.score !== null;

    if (!isReportGovSkipped) {
      if (hasFirstHalf && hasSecondHalf) {
        reportGovResScore = ((resFirst.score || 0) + (resSecond.score || 0)) / 2;
      } else if (hasFirstHalf) {
        reportGovResScore = (resFirst.score || 0) / 2;
      } else if (hasSecondHalf) {
        reportGovResScore = (resSecond.score || 0) / 2;
      }
    }
  }

  const baseTotalScore = slaScore + mysteryScore + innovationScore + stakeholderScore +
    transparencyScore + reportGovResScore +
    (isExcludedMDA ? 0 : monthlyReportScore) +
    (isExcludedMDA ? 0 : timelinessScore);

  const controversialPenalty = controversialScore < 0 ? Math.abs(controversialScore) : 0;
  const toutingRentseekingPenalty = toutingRentseekingScore < 0 ? Math.abs(toutingRentseekingScore) : 0;
  const totalScore = baseTotalScore - controversialPenalty - toutingRentseekingPenalty;

  let maxPossiblePoints = 90;
  if (isExcludedMDA) {
    maxPossiblePoints -= 35;
  }
  if (isTransparencySkipped) {
    maxPossiblePoints -= 5;
  }
  if (isReportGovSkipped) {
    maxPossiblePoints -= 15;
  }

  const totalPercentage = maxPossiblePoints > 0
    ? (totalScore / maxPossiblePoints) * 100
    : 0;

  if (!isExcludedMDA) {
    summaryBody.push(['SLA', `${slaScore.toFixed(1)}/30`]);
  }

  summaryBody.push(
    ['Mystery Shopping', `${mysteryScore.toFixed(1)}/20`],
    ['Innovation', `${innovationScore.toFixed(1)}/5`],
    ['Stakeholder Engagement', `${stakeholderScore.toFixed(1)}/10`],
    ['Transparency', isTransparencySkipped ? 'Skipped' : `${transparencyScore.toFixed(1)}/5`],
    ['Report Gov Resolution', isReportGovSkipped ? 'Skipped' : `${reportGovResScore.toFixed(1)}/15`]
  );

  if (!isExcludedMDA) {
    summaryBody.push(
      ['Monthly Report Submission', `${monthlyReportScore.toFixed(1)}/3`],
      ['Timeliness', `${timelinessScore.toFixed(1)}/2`]
    );
  }

  summaryBody.push(
    ['', ''],
    ['Base Total Score', `${baseTotalScore.toFixed(1)}/${maxPossiblePoints}`],
    ['Controversial (Penalty)', `${controversialScore.toFixed(1)} points`],
    ['Touting & Rentseeking (Penalty)', `${toutingRentseekingScore.toFixed(1)} points`],
    ['', ''],
    ['OVERALL TOTAL', `${totalScore.toFixed(1)}/${maxPossiblePoints} (${totalPercentage.toFixed(1)}%)`]
  );
  }

  if (summaryBody.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['OVERALL SCORE SUMMARY', '']],
      body: summaryBody,
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      theme: 'striped',
      didParseCell: (hookData: any) => {
        if (hookData.row.index === hookData.table.body.length - 1) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fontSize = 10;
          hookData.cell.styles.fillColor = [25, 118, 210];
          hookData.cell.styles.textColor = [255, 255, 255];
        }
      }
    });
    yPosition = (doc as any).lastAutoTable.finalY + 5;
  }

  // Save PDF
  const fileName = `${data.mdaName.replace(/[^a-z0-9]/gi, '_')}_Scoring_Report_${data.year}.pdf`;
  doc.save(fileName);
}
