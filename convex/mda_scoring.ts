import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

// Get all MDAs with their current scores
export const getMDAsWithScores = query({
  args: {},
  handler: async (ctx) => {
    const mdas = await ctx.db.query("mdas").collect();
    
    // Enrich with ticket statistics
    const enrichedMdas = await Promise.all(
      mdas.map(async (mda) => {
        const tickets = await ctx.db.query("tickets")
          .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
          .collect();
        
        const totalTickets = tickets.length;
        const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
        const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
        
        // Calculate average response and resolution times
        const responseTimes = tickets
          .filter(t => t.firstResponseAt)
          .map(t => (t.firstResponseAt! - t.createdAt) / (1000 * 60 * 60));
        
        const resolutionTimes = tickets
          .filter(t => t.status === "resolved" || t.status === "closed")
          .map(t => (t.updatedAt - t.createdAt) / (1000 * 60 * 60));
        
        const averageResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
          : 0;
        
        const averageResolutionTime = resolutionTimes.length > 0 
          ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length 
          : 0;
        
        return {
          ...mda,
          totalTickets,
          resolvedTickets,
          resolutionRate,
          averageResponseTime,
          averageResolutionTime
        };
      })
    );
    
    return enrichedMdas;
  }
});

// Get scoring history for a specific MDA
export const getMDAScoringHistory = query({
  args: { mdaId: v.id("mdas") },
  handler: async (ctx, { mdaId }) => {
    const history = await ctx.db.query("mda_scoring_history")
      .withIndex("byMda", q => q.eq("mdaId", mdaId))
      .order("desc")
      .collect();
    
    return history;
  }
});

// Get monthly reports for a specific MDA
export const getMDAMonthlyReports = query({
  args: { mdaId: v.id("mdas") },
  handler: async (ctx, { mdaId }) => {
    const reports = await ctx.db.query("mda_monthly_reports")
      .withIndex("byMda", q => q.eq("mdaId", mdaId))
      .order("desc")
      .collect();
    
    return reports;
  }
});

// Calculate and save MDA score
export const calculateAndSaveMDAScore = mutation({
  args: {
    mdaId: v.id("mdas"),
    mdaName: v.string(),
    scoringPeriod: v.string(),
    // Individual metric scores
    serviceLevelAgreementScore: v.number(),
    mysteryShoppingScore: v.number(),
    interMdaCollaborationScore: v.number(),
    stakeholderEngagementScore: v.number(),
    reportGovernanceScore: v.number(),
    reportGovernanceResolutionScore: v.number(),
    monthlyReportSubmissionScore: v.number(),
    timelinessInSubmittingScore: v.number(),
    // Performance data
    totalTickets: v.number(),
    resolvedTickets: v.number(),
    averageResponseTime: v.number(),
    averageResolutionTime: v.number(),
    resolutionRate: v.number(),
    // Website indicators
    hasActiveWebsite: v.boolean(),
    hasReportGovLink: v.boolean(),
    hasActiveUsers: v.boolean(),
    // Additional fields
    notes: v.optional(v.string()),
    recommendations: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Only admins and staff can score MDAs
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: Only admins and staff can score MDAs");
    }
    
    // Calculate total score and percentage
    const totalScore = 
      args.serviceLevelAgreementScore +
      args.mysteryShoppingScore +
      args.interMdaCollaborationScore +
      args.stakeholderEngagementScore +
      args.reportGovernanceScore +
      args.reportGovernanceResolutionScore +
      args.monthlyReportSubmissionScore +
      args.timelinessInSubmittingScore;
    
    const totalPercentage = (totalScore / 100) * 100;
    
    // Determine grade
    let grade = "F";
    if (totalPercentage >= 90) grade = "A";
    else if (totalPercentage >= 80) grade = "B";
    else if (totalPercentage >= 70) grade = "C";
    else if (totalPercentage >= 60) grade = "D";
    
    // Determine status
    const status = totalPercentage >= 70 ? "Compliant" : "Non-Compliant";
    
    // Save to scoring history
    const historyId = await ctx.db.insert("mda_scoring_history", {
      mdaId: args.mdaId,
      mdaName: args.mdaName,
      scoringPeriod: args.scoringPeriod,
      scoredBy: user._id,
      scoredAt: Date.now(),
      serviceLevelAgreementScore: args.serviceLevelAgreementScore,
      mysteryShoppingScore: args.mysteryShoppingScore,
      interMdaCollaborationScore: args.interMdaCollaborationScore,
      stakeholderEngagementScore: args.stakeholderEngagementScore,
      reportGovernanceScore: args.reportGovernanceScore,
      reportGovernanceResolutionScore: args.reportGovernanceResolutionScore,
      monthlyReportSubmissionScore: args.monthlyReportSubmissionScore,
      timelinessInSubmittingScore: args.timelinessInSubmittingScore,
      totalScore,
      totalPercentage,
      grade,
      status,
      totalTickets: args.totalTickets,
      resolvedTickets: args.resolvedTickets,
      averageResponseTime: args.averageResponseTime,
      averageResolutionTime: args.averageResolutionTime,
      resolutionRate: args.resolutionRate,
      notes: args.notes,
      recommendations: args.recommendations
    });
    
    // Update MDA table with current scores
    await ctx.db.patch(args.mdaId, {
      currentScore: totalPercentage,
      lastScoredAt: Date.now(),
      scoringPeriod: args.scoringPeriod,
      serviceLevelAgreementScore: args.serviceLevelAgreementScore,
      mysteryShoppingScore: args.mysteryShoppingScore,
      interMdaCollaborationScore: args.interMdaCollaborationScore,
      stakeholderEngagementScore: args.stakeholderEngagementScore,
      reportGovernanceScore: args.reportGovernanceScore,
      reportGovernanceResolutionScore: args.reportGovernanceResolutionScore,
      monthlyReportSubmissionScore: args.monthlyReportSubmissionScore,
      timelinessInSubmittingScore: args.timelinessInSubmittingScore,
      totalTickets: args.totalTickets,
      resolvedTickets: args.resolvedTickets,
      averageResponseTime: args.averageResponseTime,
      averageResolutionTime: args.averageResolutionTime,
      resolutionRate: args.resolutionRate,
      hasActiveWebsite: args.hasActiveWebsite,
      hasReportGovLink: args.hasReportGovLink,
      hasActiveUsers: args.hasActiveUsers
    });
    
    return {
      success: true,
      historyId,
      totalScore,
      totalPercentage,
      grade,
      status
    };
  }
});

// Get scoring analytics and leaderboard
export const getScoringAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const mdas = await ctx.db.query("mdas")
      .withIndex("byScore", q => q.gte("currentScore", 0))
      .order("desc")
      .collect();
    
    // Calculate statistics
    const totalMDAs = mdas.length;
    const compliantMDAs = mdas.filter(m => (m.currentScore || 0) >= 70).length;
    const averageScore = mdas.reduce((sum, m) => sum + (m.currentScore || 0), 0) / totalMDAs;
    
    // Grade distribution
    const gradeDistribution = {
      A: mdas.filter(m => (m.currentScore || 0) >= 90).length,
      B: mdas.filter(m => (m.currentScore || 0) >= 80 && (m.currentScore || 0) < 90).length,
      C: mdas.filter(m => (m.currentScore || 0) >= 70 && (m.currentScore || 0) < 80).length,
      D: mdas.filter(m => (m.currentScore || 0) >= 60 && (m.currentScore || 0) < 70).length,
      F: mdas.filter(m => (m.currentScore || 0) < 60).length
    };
    
    return {
      totalMDAs,
      compliantMDAs,
      nonCompliantMDAs: totalMDAs - compliantMDAs,
      complianceRate: (compliantMDAs / totalMDAs) * 100,
      averageScore,
      gradeDistribution,
      topPerformers: mdas.slice(0, 10),
      bottomPerformers: mdas.slice(-10).reverse()
    };
  }
});

// Initialize monthly reports for all MDAs
export const initializeMonthlyReports = mutation({
  args: {
    month: v.string(),
    year: v.number(),
    deadline: v.number()
  },
  handler: async (ctx, { month, year, deadline }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }
    
    const mdas = await ctx.db.query("mdas").collect();
    const now = Date.now();
    
    for (const mda of mdas) {
      // Check if report already exists for this month/year
      const existingReport = await ctx.db.query("mda_monthly_reports")
        .withIndex("byMonth", q => q.eq("month", month))
        .filter(q => q.eq(q.field("year"), year) && q.eq(q.field("mdaId"), mda._id))
        .first();
      
      if (!existingReport) {
        await ctx.db.insert("mda_monthly_reports", {
          mdaId: mda._id,
          mdaName: mda.name,
          month,
          year,
          deadline,
          submittedDate: undefined,
          submitted: false,
          onTime: false,
          reportFileId: undefined,
          reportFileName: undefined,
          submittedBy: undefined,
          status: "pending",
          notes: undefined
        });
      }
    }
    
    return { success: true, message: `Initialized monthly reports for ${mdas.length} MDAs` };
  }
});

// Get real monthly reports for MDA scoring
export const getRealMonthlyReports = query({
  args: { 
    mdaName: v.optional(v.string()),
    scoringPeriod: v.optional(v.string())
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    // Get all submitted reports from reform champions for the specified MDA
    let allReports;
    if (mdaName) {
      // Get all reports for the specific MDA, then filter by role
      allReports = await ctx.db.query("submitted_reports")
        .withIndex("byDate", q => q.gte("submittedAt", 0))
        .filter(q => q.eq(q.field("role"), "reform_champion") && q.eq(q.field("mdaName"), mdaName))
        .collect();
    } else {
      // Get all reports for the current user
      const user = await getCurrentUserOrThrow(ctx);
      allReports = await ctx.db.query("submitted_reports")
        .withIndex("bySubmittedBy", q => q.eq("submittedBy", user._id))
        .filter(q => q.eq(q.field("role"), "reform_champion"))
        .collect();
    }
    
    // Filter reports by the selected scoring period BEFORE processing
    let filteredReports = allReports;
    if (scoringPeriod) {
      const currentYear = new Date().getFullYear();
      let startDate: number, endDate: number;
      
      if (scoringPeriod.includes("1st Half")) {
        startDate = new Date(currentYear, 0, 1).getTime(); // January 1
        endDate = new Date(currentYear, 5, 30).getTime();   // June 30
      } else if (scoringPeriod.includes("2nd Half")) {
        startDate = new Date(currentYear, 6, 1).getTime();  // July 1
        endDate = new Date(currentYear, 11, 31).getTime();  // December 31
      } else {
        // Default: From January to current month
        const currentMonth = new Date().getMonth();
        startDate = new Date(currentYear, 0, 1).getTime();
        endDate = new Date(currentYear, currentMonth + 1, 0).getTime();
      }
      
      // Filter reports by date range
      filteredReports = allReports.filter(report => {
        const reportDate = report.submittedAt;
        return reportDate >= startDate && reportDate <= endDate;
      });
    }
    
    // Group reports by month and year based on scoring period
    const monthlyData = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Debug: Log the scoring period and filtering results
    console.log('getRealMonthlyReports - Scoring Period:', scoringPeriod);
    console.log('getRealMonthlyReports - Total reports found:', allReports.length);
    console.log('getRealMonthlyReports - Filtered reports:', filteredReports.length);
    
    let monthsToCheck = [];
    
    if (scoringPeriod?.includes("1st Half")) {
      // January to June of current year
      monthsToCheck = [
        { month: 0, year: currentYear },   // January
        { month: 1, year: currentYear },   // February
        { month: 2, year: currentYear },   // March
        { month: 3, year: currentYear },   // April
        { month: 4, year: currentYear },   // May
        { month: 5, year: currentYear }    // June
      ];
    } else if (scoringPeriod?.includes("2nd Half")) {
      // July to December of current year
      monthsToCheck = [
        { month: 6, year: currentYear },   // July
        { month: 7, year: currentYear },   // August
        { month: 8, year: currentYear },   // September
        { month: 9, year: currentYear },   // October
        { month: 10, year: currentYear },  // November
        { month: 11, year: currentYear }   // December
      ];
    } else {
      // Default: From January to current month (not 7 months)
      for (let month = 0; month <= currentMonth; month++) {
        monthsToCheck.push({ month, year: currentYear });
      }
    }
    
    // Process each month in the scoring period
    for (const { month, year } of monthsToCheck) {
      const checkDate = new Date(year, month, 1);
      const monthName = checkDate.toLocaleString('default', { month: 'long' });
      
      // Find reports for this month/year
      const monthReports = filteredReports.filter(report => {
        const reportDate = new Date(report.submittedAt);
        return reportDate.getMonth() === month && 
               reportDate.getFullYear() === year;
      });
      
      // Debug: Log reports found for this month
      console.log(`Month ${monthName} ${year}: Found ${monthReports.length} reports`);
      
      // Calculate deadline (last Friday of the month)
      const lastDay = new Date(year, month + 1, 0);
      const lastFriday = new Date(lastDay);
      while (lastFriday.getDay() !== 5) { // 5 = Friday
        lastFriday.setDate(lastFriday.getDate() - 1);
      }
      const deadline = lastFriday.getTime();
      
      // Check if any report was submitted
      const submitted = monthReports.length > 0;
      const submittedDate = submitted ? monthReports[0].submittedAt : null;
      const onTime = submitted && submittedDate && submittedDate <= deadline;
      
      monthlyData.push({
        month: monthName,
        year: year,
        deadline: deadline,
        submittedDate: submittedDate,
        submitted: submitted,
        onTime: onTime,
        reportCount: monthReports.length,
        reports: monthReports
      });
    }
    
    return monthlyData;
  }
});

// Get past scoring data for averaging
export const getPastScoringData = query({
  args: { 
    mdaName: v.string(),
    currentPeriod: v.string()
  },
  handler: async (ctx, { mdaName, currentPeriod }) => {
    // First get the MDA ID from the name
    const mda = await ctx.db.query("mdas")
      .withIndex("byName", q => q.eq("name", mdaName))
      .first();
    
    if (!mda) {
      return null;
    }
    
    // Get all past scoring history for this MDA
    const pastScores = await ctx.db.query("mda_scoring_history")
      .withIndex("byMda", q => q.eq("mdaId", mda._id))
      .filter(q => q.neq(q.field("scoringPeriod"), currentPeriod))
      .order("desc")
      .collect();
    
    if (pastScores.length === 0) {
      return null;
    }
    
    // Calculate averages for each metric
    const totalScores = pastScores.length;
    const averages = {
      serviceLevelAgreement: pastScores.reduce((sum, score) => sum + score.serviceLevelAgreementScore, 0) / totalScores,
      mysteryShopping: pastScores.reduce((sum, score) => sum + score.mysteryShoppingScore, 0) / totalScores,
      interMdaCollaboration: pastScores.reduce((sum, score) => sum + score.interMdaCollaborationScore, 0) / totalScores,
      stakeholderEngagement: pastScores.reduce((sum, score) => sum + score.stakeholderEngagementScore, 0) / totalScores,
      reportGovernance: pastScores.reduce((sum, score) => sum + score.reportGovernanceScore, 0) / totalScores,
      reportGovernanceResolution: pastScores.reduce((sum, score) => sum + score.reportGovernanceResolutionScore, 0) / totalScores,
      monthlyReportSubmission: pastScores.reduce((sum, score) => sum + score.monthlyReportSubmissionScore, 0) / totalScores,
      timelinessInSubmitting: pastScores.reduce((sum, score) => sum + score.timelinessInSubmittingScore, 0) / totalScores,
      totalScore: pastScores.reduce((sum, score) => sum + score.totalScore, 0) / totalScores,
      totalPercentage: pastScores.reduce((sum, score) => sum + score.totalPercentage, 0) / totalScores
    };
    
    return {
      pastScores: pastScores.length,
      averages,
      lastScored: pastScores[0]?.scoredAt || null
    };
  }
});

// Get yearly scoring data for dashboard
export const getYearlyScoringData = query({
  args: { 
    year: v.optional(v.number())
  },
  handler: async (ctx, { year }) => {
    const currentYear = year || new Date().getFullYear();
    
    // Get all scoring history for the specified year
    const yearlyScores = await ctx.db.query("mda_scoring_history")
      .withIndex("byDate", q => q.gte("scoredAt", new Date(currentYear, 0, 1).getTime()))
      .filter(q => q.lt(q.field("scoredAt"), new Date(currentYear + 1, 0, 1).getTime()))
      .collect();
    
    // Group by MDA and calculate yearly averages
    const mdaYearlyData = new Map();
    
    yearlyScores.forEach(score => {
      if (!mdaYearlyData.has(score.mdaName)) {
        mdaYearlyData.set(score.mdaName, {
          mdaName: score.mdaName,
          periods: [],
          yearlyAverage: 0
        });
      }
      
      const mdaData = mdaYearlyData.get(score.mdaName);
      mdaData.periods.push({
        period: score.scoringPeriod,
        score: score.totalPercentage,
        scoredAt: score.scoredAt
      });
    });
    
    // Calculate yearly average for each MDA
    mdaYearlyData.forEach(mdaData => {
      if (mdaData.periods.length > 0) {
        const totalScore = mdaData.periods.reduce((sum: number, period: { score: number }) => sum + period.score, 0);
        mdaData.yearlyAverage = totalScore / mdaData.periods.length;
      }
    });
    
    return Array.from(mdaYearlyData.values());
  }
});

// Get period-specific ticket data for MDA scoring
export const getPeriodTicketData = query({
  args: { 
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    // First get the MDA ID from the name
    const mda = await ctx.db.query("mdas")
      .withIndex("byName", q => q.eq("name", mdaName))
      .first();
    
    if (!mda) {
      return null;
    }
    
    // Calculate date range based on scoring period
    const currentYear = new Date().getFullYear();
    let startDate: number, endDate: number;
    
    if (scoringPeriod.includes("1st Half")) {
      startDate = new Date(currentYear, 0, 1).getTime(); // January 1
      endDate = new Date(currentYear, 5, 30).getTime();   // June 30
    } else if (scoringPeriod.includes("2nd Half")) {
      startDate = new Date(currentYear, 6, 1).getTime();  // July 1
      endDate = new Date(currentYear, 11, 31).getTime();  // December 31
    } else {
      // Default - use current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime();
    }
    
    // Get tickets for this MDA within the date range
    const tickets = await ctx.db.query("tickets")
      .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
      .filter(q => q.and(
        q.gte(q.field("createdAt"), startDate),
        q.lte(q.field("createdAt"), endDate)
      ))
      .collect();
    
    // If no tickets found for the period, get all tickets for this MDA as fallback
    if (tickets.length === 0) {
      const allTickets = await ctx.db.query("tickets")
        .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
        .collect();
      
      // Filter tickets by date range in memory (more flexible)
      const filteredTickets = allTickets.filter(ticket => 
        ticket.createdAt >= startDate && ticket.createdAt <= endDate
      );
      
      if (filteredTickets.length > 0) {
        // Use the filtered tickets
        const totalTickets = filteredTickets.length;
        const resolvedTickets = filteredTickets.filter(t => t.status === "resolved" || t.status === "closed").length;
        const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
        
        // Calculate average response and resolution times
        const responseTimes = filteredTickets
          .filter(t => t.firstResponseAt)
          .map(t => (t.firstResponseAt! - t.createdAt) / (1000 * 60 * 60));
        
        const resolutionTimes = filteredTickets
          .filter(t => t.status === "resolved" || t.status === "closed")
          .map(t => (t.updatedAt - t.createdAt) / (1000 * 60 * 60));
        
        const averageResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
          : 0;
        
        const averageResolutionTime = resolutionTimes.length > 0 
          ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length 
          : 0;
        
        return {
          totalTickets,
          resolvedTickets,
          resolutionRate,
          averageResponseTime,
          averageResolutionTime,
          period: scoringPeriod,
          startDate,
          endDate
        };
      }
    }
    
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
    const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
    
    // Calculate average response and resolution times
    const responseTimes = tickets
      .filter(t => t.firstResponseAt)
      .map(t => (t.firstResponseAt! - t.createdAt) / (1000 * 60 * 60));
    
    const resolutionTimes = tickets
      .filter(t => t.status === "resolved" || t.status === "closed")
      .map(t => (t.updatedAt - t.createdAt) / (1000 * 60 * 60));
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    const averageResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length 
      : 0;
    
    return {
      totalTickets,
      resolvedTickets,
      resolutionRate,
      averageResponseTime,
      averageResolutionTime,
      period: scoringPeriod,
      startDate,
      endDate
    };
  }
});

// Submit monthly report for an MDA
export const submitMonthlyReport = mutation({
  args: {
    mdaId: v.id("mdas"),
    month: v.string(),
    year: v.number(),
    reportFileId: v.id("_storage"),
    reportFileName: v.string()
  },
  handler: async (ctx, { mdaId, month, year, reportFileId, reportFileName }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Find the monthly report
    const report = await ctx.db.query("mda_monthly_reports")
      .withIndex("byMonth", q => q.eq("month", month))
      .filter(q => q.eq(q.field("year"), year) && q.eq(q.field("mdaId"), mdaId))
      .first();
    
    if (!report) {
      throw new Error("Monthly report not found");
    }
    
    const now = Date.now();
    const isOnTime = now <= report.deadline;
    const status = isOnTime ? "submitted" : "late";
    
    // Update the report
    await ctx.db.patch(report._id, {
      submittedDate: now,
      submitted: true,
      onTime: isOnTime,
      reportFileId,
      reportFileName,
      submittedBy: user._id,
      status
    });
    
    return { success: true, isOnTime, status };
  }
});
