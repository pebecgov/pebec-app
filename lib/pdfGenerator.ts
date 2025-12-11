import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MdaDetailedData {
  mdaName: string;
  year: number;
  sla: {
    firstHalf: any;
    secondHalf: any;
  };
  mysteryShopping: {
    firstHalf: any;
    secondHalf: any;
  };
  controversial: {
    firstHalf: any;
    secondHalf: any;
  };
  toutingRentseeking: {
    firstHalf: any;
    secondHalf: any;
  };
  innovation: {
    firstHalf: any;
    secondHalf: any;
  };
  stakeholder: {
    firstHalf: any;
    secondHalf: any;
  };
  transparency: {
    firstHalf: any;
    secondHalf: any;
  };
  reportGovResolution: {
    firstHalf: any;
    secondHalf: any;
  };
  monthlyReport: {
    firstHalf: any;
    secondHalf: any;
  };
  timeliness: {
    firstHalf: any;
    secondHalf: any;
  };
}

export async function generateMdaScoringPDF(data: MdaDetailedData): Promise<void> {
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
    doc.setFont('helvetica', 'bold');
    doc.text('PEBEC', pageWidth / 2, 20, { align: 'center' });
    yPosition = 35;
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.mdaName} - Scoring Report ${data.year}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

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
  // Generate all 12 months for the year
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const slaTableData: string[][] = [];
  
  // Collect all months with data
  const monthlyData: { [key: string]: { percentage?: number; method?: string } } = {};
  
  if (data.sla.firstHalf?.monthlySlaData) {
    Object.entries(data.sla.firstHalf.monthlySlaData).forEach(([key, value]: [string, any]) => {
      if (value && (value.method === 'file' || value.method === 'rating')) {
        monthlyData[key] = {
          percentage: value.method === 'file' ? value.overallPercentage : (value.rating / 10) * 100,
          method: value.method
        };
      }
    });
  }
  
  if (data.sla.secondHalf?.monthlySlaData) {
    Object.entries(data.sla.secondHalf.monthlySlaData).forEach(([key, value]: [string, any]) => {
      if (value && (value.method === 'file' || value.method === 'rating')) {
        monthlyData[key] = {
          percentage: value.method === 'file' ? value.overallPercentage : (value.rating / 10) * 100,
          method: value.method
        };
      }
    });
  }

  // Calculate SLA score (used for both SLA table and Overall Summary) - Exclude November (10) and December (11)
  const slaAllMonthKeys = new Set<string>();
  [data.sla.firstHalf, data.sla.secondHalf].forEach(half => {
    if (half?.monthlySlaData && typeof half.monthlySlaData === 'object') {
      Object.keys(half.monthlySlaData).forEach(key => {
        // Extract month index from key (format: "year-month")
        const monthIndex = parseInt(key.split('-')[1]);
        // Exclude November (10) and December (11)
        if (monthIndex === 10 || monthIndex === 11) return;
        
        const monthData = half.monthlySlaData[key];
        if (monthData && ((monthData.method === 'file' && monthData.overallPercentage !== null) || (monthData.method === 'rating' && monthData.rating > 0))) {
          slaAllMonthKeys.add(key);
        }
      });
    }
  });
  
  const slaTotalMonthsWithData = slaAllMonthKeys.size;
  // Recalculate sumTotalScore excluding November and December
  let slaSumTotalScore = 0;
  [data.sla.firstHalf, data.sla.secondHalf].forEach(half => {
    if (half?.monthlySlaData && typeof half.monthlySlaData === 'object') {
      Object.entries(half.monthlySlaData).forEach(([key, monthData]: [string, any]) => {
        // Extract month index from key (format: "year-month")
        const monthIndex = parseInt(key.split('-')[1]);
        // Exclude November (10) and December (11)
        if (monthIndex === 10 || monthIndex === 11) return;
        
        if (monthData && ((monthData.method === 'file' && monthData.overallPercentage !== null) || (monthData.method === 'rating' && monthData.rating > 0))) {
          // Calculate score for this month (5 points max per month)
          if (monthData.method === 'file') {
            slaSumTotalScore += (monthData.overallPercentage / 100) * 5;
          } else if (monthData.method === 'rating') {
            slaSumTotalScore += (monthData.rating / 10) * 5;
          }
        }
      });
    }
  });
  const slaMaxPossibleRawScore = slaTotalMonthsWithData * 5;
  const pointsPerMonth = 30 / 10; // Changed from 12 to 10 months
  const slaMaxPossibleScoreForMonths = slaTotalMonthsWithData * pointsPerMonth;
  const slaFinalScore = slaTotalMonthsWithData > 0 ? (slaSumTotalScore / slaMaxPossibleRawScore) * slaMaxPossibleScoreForMonths : 0;

  // Add all 12 months (0-indexed: 0 = Jan, 11 = Dec)
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = `${data.year}-${monthIndex}`;
    const monthName = monthNames[monthIndex];
    const monthData = monthlyData[monthKey];
    
    if (monthData) {
      slaTableData.push([`${monthName} ${data.year}`, `${monthData.percentage?.toFixed(1)}%`]);
    } else {
      slaTableData.push([`${monthName} ${data.year}`, 'No data']);
    }
  }
  
  // Add summary rows
  slaTableData.push(['Total Score', `${slaFinalScore.toFixed(1)}/30 (${((slaFinalScore / 30) * 100).toFixed(1)}%)`]);
  slaTableData.push(['Months with Data', `${slaTotalMonthsWithData}/10`]); // Changed from 12 to 10 (excluding Nov/Dec)

    autoTable(doc, {
      startY: yPosition,
      head: [['1. Service Level Agreement (30 points)', 'Score']],
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
      // Mystery Shopping is always out of 20 points, regardless of question count
      avgMaxScore = 20;
      if (half.percentage) avgPercentage += half.percentage;
    }
  });

  Object.entries(combinedRatings).forEach(([key, info]) => {
    const avgRating = info.values.reduce((sum, val) => sum + val, 0) / info.values.length;
    if (info.type === 'rating') {
      const points = (avgRating / 5) * 1;
      const ratingLabel = avgRating === 0 ? 'No Response' : (ratingLabels[Math.round(avgRating)] || avgRating.toFixed(1));
      mysteryTableData.push([info.label, `${ratingLabel} (${points.toFixed(2)} points)`]);
    } else {
      const answer = avgRating >= 0.5 ? 'Yes' : 'No';
      const points = avgRating >= 0.5 ? 1 : 0;
      mysteryTableData.push([info.label, `${answer} (${points} point${points === 1 ? '' : 's'})`]);
    }
  });

  const finalMysteryScore = avgTotalScore / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);
  const finalMysteryPercentage = avgPercentage / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);

  if (mysteryTableData.length > 0) {
    mysteryTableData.push(['Total Score', `${finalMysteryScore.toFixed(1)}/20 (${finalMysteryPercentage.toFixed(1)}%)`]);
    
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['2. Mystery Shopping (20 points)', '']],
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
    if (isSkipped) {
      autoTable(doc, {
        startY: yPosition,
        head: [['8. Report Gov Resolution (15 points)', '']],
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

      const tableBody = [
        ['Total Tickets', totalTickets.toFixed(0)],
        ['Resolved Tickets', resolvedTickets.toFixed(0)],
        ['Resolution Rate', `${resolutionRate.toFixed(1)}%`],
        ['Avg Response Time', `${avgResponseTime.toFixed(1)} hours`],
        ['Avg Resolution Time', `${avgResolutionTime.toFixed(1)} hours`],
        ['Score', `${avgScore.toFixed(1)}/15`]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['8. Report Gov Resolution (15 points)', '']],
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

  // Monthly Report Submission - show all 12 months but exclude Nov/Dec from calculations
  const monthlyReportTableData: string[][] = [];
  const monthlyReportMonths: { [key: string]: boolean } = {};
  [data.monthlyReport.firstHalf, data.monthlyReport.secondHalf].forEach(half => {
    if (half?.manualMonthlyReports && typeof half.manualMonthlyReports === 'object') {
      Object.entries(half.manualMonthlyReports).forEach(([key, value]) => {
        // Extract month index from key (format: "year-month")
        const monthIndex = parseInt(key.split('-')[1]);
        // Exclude November (10) and December (11) from calculations
        if (monthIndex === 10 || monthIndex === 11) return;
        
        if (value) monthlyReportMonths[key] = true;
      });
    }
  });

  // Add all 12 months (0-indexed: 0 = Jan, 11 = Dec) for display
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = `${data.year}-${monthIndex}`;
    const monthName = monthNames[monthIndex];
    const isSubmitted = monthlyReportMonths[monthKey] === true;
    
    monthlyReportTableData.push([`${monthName} ${data.year}`, isSubmitted ? 'Submitted' : 'Not submitted']);
  }

  const monthlyReportCount = Object.keys(monthlyReportMonths).length;
  const monthlyReportScore = monthlyReportCount * (3 / 10); // Changed from 12 to 10 months

  if (monthlyReportTableData.length > 0) {
    monthlyReportTableData.push(['Total Score', `${monthlyReportScore.toFixed(1)}/3`]);
    monthlyReportTableData.push(['Months Submitted', `${monthlyReportCount}/10`]); // Changed from 12 to 10 (excluding Nov/Dec)

    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['9. Monthly Report Submission (3 points)', 'Status']],
      body: monthlyReportTableData.slice(0, -2),
      headStyles: {
        fillColor: [0, 150, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      theme: 'striped'
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(monthlyReportTableData[monthlyReportTableData.length - 2][0] + ': ' + monthlyReportTableData[monthlyReportTableData.length - 2][1], 14, yPosition);
    yPosition += 6;
    doc.text(monthlyReportTableData[monthlyReportTableData.length - 1][0] + ': ' + monthlyReportTableData[monthlyReportTableData.length - 1][1], 14, yPosition);
    yPosition += 15;
  }

  // Timeliness - show all 12 months but exclude Nov/Dec from calculations
  const timelinessTableData: string[][] = [];
  const timelinessMonths: { [key: string]: boolean } = {};
  [data.timeliness.firstHalf, data.timeliness.secondHalf].forEach(half => {
    if (half?.manualTimeliness && typeof half.manualTimeliness === 'object') {
      Object.entries(half.manualTimeliness).forEach(([key, value]) => {
        // Extract month index from key (format: "year-month")
        const monthIndex = parseInt(key.split('-')[1]);
        // Exclude November (10) and December (11) from calculations
        if (monthIndex === 10 || monthIndex === 11) return;
        
        if (value) timelinessMonths[key] = true;
      });
    }
  });

  // Add all 12 months (0-indexed: 0 = Jan, 11 = Dec) for display
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = `${data.year}-${monthIndex}`;
    const monthName = monthNames[monthIndex];
    const isOnTime = timelinessMonths[monthKey] === true;
    
    timelinessTableData.push([`${monthName} ${data.year}`, isOnTime ? 'On Time' : 'Late']);
  }

  const timelinessCount = Object.keys(timelinessMonths).length;
  const timelinessScore = timelinessCount * (2 / 10); // Changed from 12 to 10 months

  // Add summary rows
  timelinessTableData.push(['Total Score', `${timelinessScore.toFixed(1)}/2`]);
  timelinessTableData.push(['Months On Time', `${timelinessCount}/10`]); // Changed from 12 to 10 (excluding Nov/Dec)

  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }

  autoTable(doc, {
    startY: yPosition,
    head: [['10. Timeliness in Submitting Report (2 points)', 'Status']],
    body: timelinessTableData.slice(0, -2),
    headStyles: {
      fillColor: [121, 85, 72],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: { fontSize: 9 },
    theme: 'striped'
  });
  yPosition = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(timelinessTableData[timelinessTableData.length - 2][0] + ': ' + timelinessTableData[timelinessTableData.length - 2][1], 14, yPosition);
  yPosition += 6;
  doc.text(timelinessTableData[timelinessTableData.length - 1][0] + ': ' + timelinessTableData[timelinessTableData.length - 1][1], 14, yPosition);
  yPosition += 15;

  // Overall Score Summary
  // Reuse SLA score calculated earlier
  const slaScore = slaFinalScore;

  const mysteryScore = avgTotalScore / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);
  
  // Controversial: Handle both old and new data formats
  let controversialScore = data.controversial.firstHalf || data.controversial.secondHalf ?
    ((data.controversial.firstHalf?.score || 0) + (data.controversial.secondHalf?.score || 0)) / 2 : 0;
  if (data.controversial.firstHalf || data.controversial.secondHalf) {
    const isOldFormat = controversialScore >= 0 && controversialScore <= 5;
    if (isOldFormat) {
      const isControversial = data.controversial.firstHalf?.isControversial || data.controversial.secondHalf?.isControversial;
      controversialScore = isControversial ? -5 : 0;
    }
  }

  // Touting & Rentseeking: If Yes (true), score is -10. If No (false), score is 0.
  let toutingRentseekingScore = 0;
  if (data.toutingRentseeking?.firstHalf || data.toutingRentseeking?.secondHalf) {
    const toutingFirst = data.toutingRentseeking?.firstHalf;
    const toutingSecond = data.toutingRentseeking?.secondHalf;
    if (toutingFirst && toutingSecond) {
      // Both halves have data - average
      toutingRentseekingScore = ((toutingFirst.score || 0) + (toutingSecond.score || 0)) / 2;
    } else if (toutingFirst) {
      // Only first half
      toutingRentseekingScore = toutingFirst.score || 0;
    } else if (toutingSecond) {
      // Only second half
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
  // Calculate Report Gov Resolution score (divide by 2 if only one half, average if both halves)
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
        // Both halves have data - average
        reportGovResScore = ((resFirst.score || 0) + (resSecond.score || 0)) / 2;
      } else if (hasFirstHalf) {
        // Only first half - divide by 2
        reportGovResScore = (resFirst.score || 0) / 2;
      } else if (hasSecondHalf) {
        // Only second half - divide by 2
        reportGovResScore = (resSecond.score || 0) / 2;
      }
    }
  }

  // Calculate base total score (all metrics except controversial and touting & rentseeking)
  const baseTotalScore = slaScore + mysteryScore + innovationScore + stakeholderScore + 
                    transparencyScore + reportGovResScore + monthlyReportScore + timelinessScore;

  // Calculate penalties (convert negative scores to positive penalty values)
  const controversialPenalty = controversialScore < 0 ? Math.abs(controversialScore) : 0;
  const toutingRentseekingPenalty = toutingRentseekingScore < 0 ? Math.abs(toutingRentseekingScore) : 0;
  const totalScore = baseTotalScore - controversialPenalty - toutingRentseekingPenalty;
  
  let maxPossiblePoints = 90;
  if (isTransparencySkipped) {
    maxPossiblePoints -= 5;
  }
  if (isReportGovSkipped) {
    maxPossiblePoints -= 15;
  }
  const totalPercentage = maxPossiblePoints > 0
    ? (totalScore / maxPossiblePoints) * 100
    : 0;

  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  const summaryBody = [
    ['SLA', `${slaScore.toFixed(1)}/30`],
    ['Mystery Shopping', `${mysteryScore.toFixed(1)}/20`],
    ['Innovation', `${innovationScore.toFixed(1)}/5`],
    ['Stakeholder Engagement', `${stakeholderScore.toFixed(1)}/10`],
    ['Transparency', isTransparencySkipped ? 'Skipped' : `${transparencyScore.toFixed(1)}/5`],
    ['Report Gov Resolution', isReportGovSkipped ? 'Skipped' : `${reportGovResScore.toFixed(1)}/15`],
    ['Monthly Report Submission', `${monthlyReportScore.toFixed(1)}/3`],
    ['Timeliness', `${timelinessScore.toFixed(1)}/2`],
    ['', ''],
    ['Base Total Score', `${baseTotalScore.toFixed(1)}/${maxPossiblePoints}`],
    ['Controversial (Penalty)', `${controversialScore.toFixed(1)} points`],
    ['Touting & Rentseeking (Penalty)', `${toutingRentseekingScore.toFixed(1)} points`],
    ['', ''],
    maxPossiblePoints !== 90
      ? ['OVERALL TOTAL', `${totalScore.toFixed(1)}/${maxPossiblePoints} (${totalPercentage.toFixed(1)}%) - Normalized`]
      : ['OVERALL TOTAL', `${totalScore.toFixed(1)}/${maxPossiblePoints} (${totalPercentage.toFixed(1)}%)`]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['OVERALL SCORE SUMMARY', '']],
    body: summaryBody,
    headStyles: {
      fillColor: [25, 118, 210],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 12
    },
    bodyStyles: {
      fontSize: 10
    },
    styles: { 
      fontSize: 10,
      cellPadding: 4
    },
    theme: 'striped',
    didParseCell: (data: any) => {
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
        data.cell.styles.fillColor = [25, 118, 210];
        data.cell.styles.textColor = [255, 255, 255];
      }
    }
  });

  // Save PDF
  const fileName = `${data.mdaName.replace(/[^a-z0-9]/gi, '_')}_Scoring_Report_${data.year}.pdf`;
  doc.save(fileName);
}
