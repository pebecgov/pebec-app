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
  collaboration: {
    firstHalf: any;
    secondHalf: any;
  };
  stakeholder: {
    firstHalf: any;
    secondHalf: any;
  };
  reportGovernance: {
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
    doc.setFont(undefined, 'bold');
    doc.text('PEBEC', pageWidth / 2, 20, { align: 'center' });
    yPosition = 35;
  }

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
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

  // Calculate SLA score (used for both SLA table and Overall Summary)
  const slaAllMonthKeys = new Set<string>();
  [data.sla.firstHalf, data.sla.secondHalf].forEach(half => {
    if (half?.monthlySlaData && typeof half.monthlySlaData === 'object') {
      Object.keys(half.monthlySlaData).forEach(key => {
        const monthData = half.monthlySlaData[key];
        if (monthData && ((monthData.method === 'file' && monthData.overallPercentage !== null) || (monthData.method === 'rating' && monthData.rating > 0))) {
          slaAllMonthKeys.add(key);
        }
      });
    }
  });
  
  const slaTotalMonthsWithData = slaAllMonthKeys.size;
  const slaSumTotalScore = [data.sla.firstHalf, data.sla.secondHalf]
    .filter(Boolean)
    .reduce((sum, d) => sum + (d.totalScore || 0), 0);
  const slaMaxPossibleRawScore = slaTotalMonthsWithData * 5;
  const pointsPerMonth = 30 / 12;
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
  slaTableData.push(['Months with Data', `${slaTotalMonthsWithData}/12`]);

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
    doc.setFont(undefined, 'bold');
    doc.text(slaTableData[slaTableData.length - 2][0] + ': ' + slaTableData[slaTableData.length - 2][1], 14, yPosition);
    yPosition += 6;
    doc.text(slaTableData[slaTableData.length - 1][0] + ': ' + slaTableData[slaTableData.length - 1][1], 14, yPosition);
    yPosition += 15;

  // Mystery Shopping - combine both halves
  const mysteryTableData: string[][] = [];
  const hasReportGovQuestions = [
    { key: 'reportGovIntegration', label: 'REPORTGOV INTEGRATION', type: 'rating' },
    { key: 'callResponse', label: 'CALL RESPOND RATING', type: 'rating' },
    { key: 'emailResponse', label: 'EMAIL RESPOND RATING', type: 'rating' },
    { key: 'functionalWebsite', label: 'FUNCTIONAL WEBSITE', type: 'yesno' },
    { key: 'csEmails', label: 'CUSTOMER SERVICES (CS) EMAILS LISTED', type: 'yesno' },
    { key: 'csPhone', label: 'CUSTOMER SERVICES (CS) PHONE NUMBER LISTED', type: 'yesno' },
    { key: 'faqAvailable', label: 'FAQ AVAILABLE', type: 'yesno' },
    { key: 'onlineApplication', label: 'AVAILABILITY OF ONLINE APPLICATION/PROCESS', type: 'yesno' },
    { key: 'onlineApproval', label: 'APPROVAL/FACILITY GRANTED ONLINE', type: 'yesno' }
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
    { key: 'reportGovLink', label: 'REPORTGOV LINK INTEGRATED ON MDA WEBSITE', type: 'yesno' }
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
      if (half.maxPossibleScore) avgMaxScore = Math.max(avgMaxScore, half.maxPossibleScore);
      if (half.percentage) avgPercentage += half.percentage;
    }
  });

  Object.entries(combinedRatings).forEach(([key, info]) => {
    const avgRating = info.values.reduce((sum, val) => sum + val, 0) / info.values.length;
    if (info.type === 'rating') {
      const points = (avgRating / 5) * 1;
      mysteryTableData.push([info.label, `${ratingLabels[Math.round(avgRating)] || avgRating.toFixed(1)} (${points.toFixed(2)} pts)`]);
    } else {
      const answer = avgRating >= 0.5 ? 'Yes' : 'No';
      const points = avgRating >= 0.5 ? 1 : 0;
      mysteryTableData.push([info.label, `${answer} (${points} pt${points === 1 ? '' : 's'})`]);
    }
  });

  const finalMysteryScore = avgTotalScore / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);
  const finalMysteryPercentage = avgPercentage / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);

  if (mysteryTableData.length > 0) {
    mysteryTableData.push(['Total Score', `${finalMysteryScore.toFixed(1)}/${avgMaxScore || 20} (${finalMysteryPercentage.toFixed(1)}%)`]);
    
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
    doc.setFont(undefined, 'bold');
    doc.text(mysteryTableData[mysteryTableData.length - 1][0] + ': ' + mysteryTableData[mysteryTableData.length - 1][1], 14, yPosition);
    yPosition += 15;
  }

  // Inter MDA Collaboration - average both halves
  if (data.collaboration.firstHalf || data.collaboration.secondHalf) {
    const collabFirst = data.collaboration.firstHalf || { rate: 0, score: 0 };
    const collabSecond = data.collaboration.secondHalf || { rate: 0, score: 0 };
    const avgRate = ((collabFirst.rate || 0) + (collabSecond.rate || 0)) / 2;
    const avgScore = ((collabFirst.score || 0) + (collabSecond.score || 0)) / 2;

    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['3. Inter MDA Collaboration (15 points)', '']],
      body: [
        ['Rate', `${avgRate.toFixed(1)}/10`],
        ['Score', `${avgScore.toFixed(1)}/15`]
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
      head: [['4. Stakeholder Engagement (10 points)', '']],
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

  // Report Governance - combine both halves
  if (data.reportGovernance.firstHalf || data.reportGovernance.secondHalf) {
    const checkedItems = new Set<string>();
    let avgScore = 0;
    let count = 0;

    [data.reportGovernance.firstHalf, data.reportGovernance.secondHalf].forEach(half => {
      if (half) {
        if (half.activeWebsite) checkedItems.add('Active Website');
        if (half.activeUsers) checkedItems.add('Active Users');
        if (half.reportGovLink) checkedItems.add('ReportGov Link');
        if (half.score) {
          avgScore += half.score;
          count++;
        }
      }
    });

    const finalScore = count > 0 ? avgScore / count : 0;

    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['5. Report Governance (5 points)', '']],
      body: [
        ['Items', Array.from(checkedItems).join(', ') || 'None'],
        ['Score', `${finalScore.toFixed(1)}/5`]
      ],
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

  // Report Gov Resolution - sum tickets, average times and score
  if (data.reportGovResolution.firstHalf || data.reportGovResolution.secondHalf) {
    const resFirst = data.reportGovResolution.firstHalf || {};
    const resSecond = data.reportGovResolution.secondHalf || {};
    
    // Sum total tickets and resolved tickets (add both halves)
    const totalTickets = (resFirst.totalTickets || 0) + (resSecond.totalTickets || 0);
    const resolvedTickets = (resFirst.resolvedTickets || 0) + (resSecond.resolvedTickets || 0);
    
    // Calculate resolution rate from summed values
    const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
    
    // Average response time and resolution time (only if both halves have data)
    let avgResponseTime = resFirst.averageResponseTime || 0;
    let avgResolutionTime = resFirst.averageResolutionTime || 0;
    if (resFirst.averageResponseTime && resSecond.averageResponseTime) {
      avgResponseTime = ((resFirst.averageResponseTime || 0) + (resSecond.averageResponseTime || 0)) / 2;
    } else if (resSecond.averageResponseTime) {
      avgResponseTime = resSecond.averageResponseTime;
    }
    
    if (resFirst.averageResolutionTime && resSecond.averageResolutionTime) {
      avgResolutionTime = ((resFirst.averageResolutionTime || 0) + (resSecond.averageResolutionTime || 0)) / 2;
    } else if (resSecond.averageResolutionTime) {
      avgResolutionTime = resSecond.averageResolutionTime;
    }
    
    // Average score (only if both halves have data)
    let avgScore = resFirst.score || 0;
    if (resFirst.score && resSecond.score) {
      avgScore = ((resFirst.score || 0) + (resSecond.score || 0)) / 2;
    } else if (resSecond.score) {
      avgScore = resSecond.score;
    }

    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['6. Report Gov Resolution (15 points)', '']],
      body: [
        ['Total Tickets', totalTickets.toFixed(0)],
        ['Resolved Tickets', resolvedTickets.toFixed(0)],
        ['Resolution Rate', `${resolutionRate.toFixed(1)}%`],
        ['Avg Response Time', `${avgResponseTime.toFixed(1)} hours`],
        ['Avg Resolution Time', `${avgResolutionTime.toFixed(1)} hours`],
        ['Score', `${avgScore.toFixed(1)}/15`]
      ],
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

  // Monthly Report Submission - show all 12 months
  const monthlyReportTableData: string[][] = [];
  const monthlyReportMonths: { [key: string]: boolean } = {};
  [data.monthlyReport.firstHalf, data.monthlyReport.secondHalf].forEach(half => {
    if (half?.manualMonthlyReports && typeof half.manualMonthlyReports === 'object') {
      Object.entries(half.manualMonthlyReports).forEach(([key, value]) => {
        if (value) monthlyReportMonths[key] = true;
      });
    }
  });

  // Add all 12 months (0-indexed: 0 = Jan, 11 = Dec)
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = `${data.year}-${monthIndex}`;
    const monthName = monthNames[monthIndex];
    const isSubmitted = monthlyReportMonths[monthKey] === true;
    
    monthlyReportTableData.push([`${monthName} ${data.year}`, isSubmitted ? 'Submitted' : 'Not submitted']);
  }

  const monthlyReportCount = Object.keys(monthlyReportMonths).length;
  const monthlyReportScore = monthlyReportCount * (3 / 12);

  if (monthlyReportTableData.length > 0) {
    monthlyReportTableData.push(['Total Score', `${monthlyReportScore.toFixed(1)}/3`]);
    monthlyReportTableData.push(['Months Submitted', `${monthlyReportCount}/12`]);

    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['7. Monthly Report Submission (3 points)', 'Status']],
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
    doc.setFont(undefined, 'bold');
    doc.text(monthlyReportTableData[monthlyReportTableData.length - 2][0] + ': ' + monthlyReportTableData[monthlyReportTableData.length - 2][1], 14, yPosition);
    yPosition += 6;
    doc.text(monthlyReportTableData[monthlyReportTableData.length - 1][0] + ': ' + monthlyReportTableData[monthlyReportTableData.length - 1][1], 14, yPosition);
    yPosition += 15;
  }

  // Timeliness - show all 12 months
  const timelinessTableData: string[][] = [];
  const timelinessMonths: { [key: string]: boolean } = {};
  [data.timeliness.firstHalf, data.timeliness.secondHalf].forEach(half => {
    if (half?.manualTimeliness && typeof half.manualTimeliness === 'object') {
      Object.entries(half.manualTimeliness).forEach(([key, value]) => {
        if (value) timelinessMonths[key] = true;
      });
    }
  });

  // Add all 12 months (0-indexed: 0 = Jan, 11 = Dec)
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = `${data.year}-${monthIndex}`;
    const monthName = monthNames[monthIndex];
    const isOnTime = timelinessMonths[monthKey] === true;
    
    timelinessTableData.push([`${monthName} ${data.year}`, isOnTime ? 'On Time' : 'Late']);
  }

  const timelinessCount = Object.keys(timelinessMonths).length;
  const timelinessScore = timelinessCount * (2 / 12);

  // Add summary rows
  timelinessTableData.push(['Total Score', `${timelinessScore.toFixed(1)}/2`]);
  timelinessTableData.push(['Months On Time', `${timelinessCount}/12`]);

  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }

  autoTable(doc, {
    startY: yPosition,
    head: [['8. Timeliness in Submitting Report (2 points)', 'Status']],
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
  doc.setFont(undefined, 'bold');
  doc.text(timelinessTableData[timelinessTableData.length - 2][0] + ': ' + timelinessTableData[timelinessTableData.length - 2][1], 14, yPosition);
  yPosition += 6;
  doc.text(timelinessTableData[timelinessTableData.length - 1][0] + ': ' + timelinessTableData[timelinessTableData.length - 1][1], 14, yPosition);
  yPosition += 15;

  // Overall Score Summary
  // Reuse SLA score calculated earlier
  const slaScore = slaFinalScore;

  const mysteryScore = avgTotalScore / ([data.mysteryShopping.firstHalf, data.mysteryShopping.secondHalf].filter(Boolean).length || 1);
  const collabScore = data.collaboration.firstHalf || data.collaboration.secondHalf ?
    ((data.collaboration.firstHalf?.score || 0) + (data.collaboration.secondHalf?.score || 0)) / 2 : 0;
  const stakeholderScore = data.stakeholder.firstHalf || data.stakeholder.secondHalf ?
    ((data.stakeholder.firstHalf?.score || 0) + (data.stakeholder.secondHalf?.score || 0)) / 2 : 0;
  const reportGovScore = data.reportGovernance.firstHalf || data.reportGovernance.secondHalf ?
    ((data.reportGovernance.firstHalf?.score || 0) + (data.reportGovernance.secondHalf?.score || 0)) / 2 : 0;
  // Calculate Report Gov Resolution score (average if both halves exist, otherwise use available one)
  let reportGovResScore = 0;
  if (data.reportGovResolution.firstHalf || data.reportGovResolution.secondHalf) {
    const resFirst = data.reportGovResolution.firstHalf || {};
    const resSecond = data.reportGovResolution.secondHalf || {};
    if (resFirst.score && resSecond.score) {
      reportGovResScore = ((resFirst.score || 0) + (resSecond.score || 0)) / 2;
    } else if (resFirst.score) {
      reportGovResScore = resFirst.score;
    } else if (resSecond.score) {
      reportGovResScore = resSecond.score;
    }
  }

  const totalScore = slaScore + mysteryScore + collabScore + stakeholderScore + 
                    reportGovScore + reportGovResScore + monthlyReportScore + timelinessScore;

  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  autoTable(doc, {
    startY: yPosition,
    head: [['OVERALL SCORE SUMMARY', '']],
    body: [
      ['SLA', `${slaScore.toFixed(1)}/30`],
      ['Mystery Shopping', `${mysteryScore.toFixed(1)}/20`],
      ['Inter MDA Collaboration', `${collabScore.toFixed(1)}/15`],
      ['Stakeholder Engagement', `${stakeholderScore.toFixed(1)}/10`],
      ['Report Governance', `${reportGovScore.toFixed(1)}/5`],
      ['Report Gov Resolution', `${reportGovResScore.toFixed(1)}/15`],
      ['Monthly Report Submission', `${monthlyReportScore.toFixed(1)}/3`],
      ['Timeliness', `${timelinessScore.toFixed(1)}/2`],
      ['', ''],
      ['OVERALL TOTAL', `${totalScore.toFixed(1)}/100 (${totalScore.toFixed(1)}%)`]
    ],
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
