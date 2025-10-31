import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

// Helper function to find MDA by flexible name matching
async function findMdaByName(ctx: any, mdaName: string) {
  // First try exact match
  let mda = await ctx.db.query("mdas")
    .withIndex("byName", (q: any) => q.eq("name", mdaName))
    .first();
  
  if (mda) return mda;
  
  // If not found, try to find by partial matching
  const allMdas = await ctx.db.query("mdas").collect();
  
  // Try to find by abbreviation prefix (e.g., "BPP - Bureau for Public Procurement" matches "Bureau for Public Procurement")
  mda = allMdas.find((m: any) => {
    // Remove abbreviation prefix and compare
    const nameWithoutPrefix = m.name.replace(/^[^-]+ - /, '');
    return nameWithoutPrefix === mdaName || m.name.includes(mdaName) || mdaName.includes(nameWithoutPrefix);
  });
  
  return mda || null;
}

// Get all MDAs with their latest scores from scoring history
export const getMDAsWithScores = query({
  args: {},
  handler: async (ctx) => {
    const mdas = await ctx.db.query("mdas").collect();
    
    // Get latest scores for each MDA from scoring history
    const enrichedMdas = await Promise.all(
      mdas.map(async (mda) => {
        // Get the latest scoring record for this MDA
        const latestScore = await ctx.db.query("mda_scoring_history")
          .withIndex("byMda", q => q.eq("mdaId", mda._id))
          .order("desc")
          .first();
        
        // Get current year ticket statistics
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1).getTime();
        const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).getTime();
        
        const tickets = await ctx.db.query("tickets")
          .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
          .filter(q => q.and(
            q.gte(q.field("createdAt"), yearStart),
            q.lte(q.field("createdAt"), yearEnd)
          ))
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
          latestScore: latestScore || null,
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
    mdaId: v.optional(v.id("mdas")),
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
    recommendations: v.optional(v.string()),
    // Scoring method fields
    maxPossiblePoints: v.optional(v.number()),
    scoringMethod: v.optional(v.string())
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
    
    // Use provided maxPossiblePoints or default to 100
    const maxPossiblePoints = args.maxPossiblePoints || 100;
    const totalPercentage = (totalScore / maxPossiblePoints) * 100;
    
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
      maxPossiblePoints: maxPossiblePoints,
      scoringMethod: args.scoringMethod || "standard",
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
    
    // No need to update MDA table anymore - all scoring data is in mda_scoring_history
    
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
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const targetYear = year || new Date().getFullYear();
    // Get all unique MDA names from scoring history (only scored MDAs)
    const allScoringHistory = await ctx.db.query("mda_scoring_history").collect();
    const uniqueMdaNames = [...new Set(allScoringHistory.map(score => score.mdaName))];
    
    // Get MDAs from mdas table
    const mdas = await ctx.db.query("mdas").collect();
    const mdaNamesFromTable = mdas.map(mda => mda.name);
    
    // Combine all MDA names (from table + from scoring history)
    const allMdaNames = [...new Set([...mdaNamesFromTable, ...uniqueMdaNames])];
    
    // Get latest scores for each MDA from scoring history
    const mdasWithLatestScores = await Promise.all(
      allMdaNames.map(async (mdaName) => {
        // Find MDA in table if it exists
        const mda = mdas.find(m => m.name === mdaName);
        
        // Get all scores for this MDA (by name, since mdaId might be null)
        const allScores = await ctx.db.query("mda_scoring_history")
          .withIndex("byMdaName", q => q.eq("mdaName", mdaName))
          .order("desc")
          .collect();
        
        if (allScores.length === 0) {
          return {
            _id: mda?._id || null,
            name: mdaName,
            description: mda?.description,
            email: mda?.email,
            phoneNumber: mda?.phoneNumber,
            assignedUsers: mda?.assignedUsers || [],
            createdAt: mda?.createdAt || 0,
            currentScore: 0,
            latestScore: null,
            isActiveOnPlatform: !!mda
          };
        }
        
        // Get target year scores
        const targetYearScores = allScores.filter(score => {
          const scoreYear = new Date(score.scoredAt).getFullYear();
          return scoreYear === targetYear;
        });
        
        let rankingScore = 0;
        let latestScore = allScores[0]; // Most recent score for display
        
        if (targetYearScores.length > 0) {
          // Check if we have both 1st and 2nd half scores for target year
          const firstHalf = targetYearScores.find(s => s.scoringPeriod.includes('1st Half'));
          const secondHalf = targetYearScores.find(s => s.scoringPeriod.includes('2nd Half'));
          
          if (firstHalf && secondHalf) {
            // Both periods available - use average for ranking
            rankingScore = (firstHalf.totalPercentage + secondHalf.totalPercentage) / 2;
          } else {
            // Only one period available - use that score for ranking
            rankingScore = targetYearScores[0].totalPercentage;
          }
        } else {
          // No target year scores, use latest score
          rankingScore = latestScore.totalPercentage;
        }
        
        return {
          _id: mda?._id || null,
          name: mdaName,
          description: mda?.description,
          email: mda?.email,
          phoneNumber: mda?.phoneNumber,
          assignedUsers: mda?.assignedUsers || [],
          createdAt: mda?.createdAt || 0,
          currentScore: rankingScore,
          latestScore,
          isActiveOnPlatform: !!mda
        };
      })
    );
    
    // Filter to only include MDAs that have been scored (currentScore > 0)
    const scoredMdas = mdasWithLatestScores.filter(m => m.currentScore > 0);
    
    // Sort by current score
    const sortedMdas = scoredMdas.sort((a, b) => b.currentScore - a.currentScore);
    
    // Calculate statistics
    const totalMDAs = sortedMdas.length;
    const compliantMDAs = sortedMdas.filter(m => m.currentScore >= 70).length;
    const averageScore = totalMDAs > 0 ? sortedMdas.reduce((sum, m) => sum + m.currentScore, 0) / totalMDAs : 0;
    
    // Grade distribution
    const gradeDistribution = {
      A: sortedMdas.filter(m => m.currentScore >= 90).length,
      B: sortedMdas.filter(m => m.currentScore >= 80 && m.currentScore < 90).length,
      C: sortedMdas.filter(m => m.currentScore >= 70 && m.currentScore < 80).length,
      D: sortedMdas.filter(m => m.currentScore >= 60 && m.currentScore < 70).length,
      F: sortedMdas.filter(m => m.currentScore < 60).length
    };
    
    return {
      totalMDAs,
      compliantMDAs,
      nonCompliantMDAs: totalMDAs - compliantMDAs,
      complianceRate: totalMDAs > 0 ? (compliantMDAs / totalMDAs) * 100 : 0,
      averageScore,
      gradeDistribution,
      topPerformers: sortedMdas.slice(0, 10),
      bottomPerformers: sortedMdas.slice(-10).reverse()
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
      // Find the MDA using flexible matching to get the correct name
      const mda = await findMdaByName(ctx, mdaName);
      const actualMdaName = mda ? mda.name : mdaName;
      
      // Get all reports for the specific MDA, then filter by role
      allReports = await ctx.db.query("submitted_reports")
        .withIndex("byDate", q => q.gte("submittedAt", 0))
        .filter(q => q.eq(q.field("role"), "reform_champion") && q.eq(q.field("mdaName"), actualMdaName))
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
      
      // Extract year from scoring period (e.g., "1st Half 2024" -> 2024)
      const yearMatch = scoringPeriod.match(/\d{4}/);
      const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      
      let startDate: number, endDate: number;
      
      if (scoringPeriod.includes("1st Half")) {
        startDate = new Date(targetYear, 0, 1).getTime(); // January 1
        endDate = new Date(targetYear, 5, 30, 23, 59, 59).getTime();   // June 30 end of day
      } else if (scoringPeriod.includes("2nd Half")) {
        startDate = new Date(targetYear, 6, 1).getTime();  // July 1
        endDate = new Date(targetYear, 11, 31, 23, 59, 59).getTime();  // December 31 end of day
      } else {
        // Default: From January to current month
        const currentMonth = new Date().getMonth();
        startDate = new Date(targetYear, 0, 1).getTime();
        endDate = new Date(targetYear, currentMonth + 1, 0, 23, 59, 59).getTime();
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
    
    // Extract year from scoring period for monthsToCheck
    const yearMatch = scoringPeriod?.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
    
    // Debug: Log the scoring period and filtering results
    console.log('getRealMonthlyReports - Scoring Period:', scoringPeriod);
    console.log('getRealMonthlyReports - Target Year:', targetYear);
    console.log('getRealMonthlyReports - Total reports found:', allReports.length);
    console.log('getRealMonthlyReports - Filtered reports:', filteredReports.length);
    
    let monthsToCheck = [];
    
    if (scoringPeriod?.includes("1st Half")) {
      // January to June of target year
      monthsToCheck = [
        { month: 0, year: targetYear },   // January
        { month: 1, year: targetYear },   // February
        { month: 2, year: targetYear },   // March
        { month: 3, year: targetYear },   // April
        { month: 4, year: targetYear },   // May
        { month: 5, year: targetYear }    // June
      ];
    } else if (scoringPeriod?.includes("2nd Half")) {
      // July to December of target year
      monthsToCheck = [
        { month: 6, year: targetYear },   // July
        { month: 7, year: targetYear },   // August
        { month: 8, year: targetYear },   // September
        { month: 9, year: targetYear },   // October
        { month: 10, year: targetYear },  // November
        { month: 11, year: targetYear }   // December
      ];
    } else {
      // Default: From January to current month (not 7 months)
      for (let month = 0; month <= currentMonth; month++) {
        monthsToCheck.push({ month, year: targetYear });
      }
    }
    
    // Track which reports have been assigned to a month by name (to avoid duplicates)
    const reportsAssignedByName = new Set<string>();
    
    // Process each month in the scoring period
    for (const { month, year } of monthsToCheck) {
      const checkDate = new Date(year, month, 1);
      const monthName = checkDate.toLocaleString('default', { month: 'long' });
      const monthNameShort = checkDate.toLocaleString('default', { month: 'short' });
      
      // Helper function to check if report name contains month name
      const reportNameContainsMonth = (reportName: string | undefined): boolean => {
        if (!reportName) return false;
        const nameLower = reportName.toLowerCase();
        return nameLower.includes(monthName.toLowerCase()) || 
               nameLower.includes(monthNameShort.toLowerCase());
      };
      
      // Find reports for this month/year - prioritize name matching over date
      const monthReports = filteredReports.filter(report => {
        const reportId = report._id;
        const reportDate = new Date(report.submittedAt);
        
        // First check by report name (higher priority) - if report name contains this month
        const matchesByName = reportNameContainsMonth(report.reportName);
        if (matchesByName && !reportsAssignedByName.has(reportId)) {
          reportsAssignedByName.add(reportId);
          return true;
        }
        
        // If not matched by name, check by submission date (and not already assigned by name to another month)
        const matchesByDate = !reportsAssignedByName.has(reportId) &&
                             reportDate.getMonth() === month && 
                             reportDate.getFullYear() === year;
        
        return matchesByDate;
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
    // First get the MDA ID from the name using flexible matching
    const mda = await findMdaByName(ctx, mdaName);
    
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
    // For MDAs with both 1st and 2nd half: use average of both
    // For MDAs with only one period: use that score
    mdaYearlyData.forEach(mdaData => {
      if (mdaData.periods.length > 0) {
        // Check if we have both 1st and 2nd half scores
        const firstHalf = mdaData.periods.find((p: any) => p.period.includes('1st Half'));
        const secondHalf = mdaData.periods.find((p: any) => p.period.includes('2nd Half'));
        
        if (firstHalf && secondHalf) {
          // Both periods available - use average
          mdaData.yearlyAverage = (firstHalf.score + secondHalf.score) / 2;
        } else {
          // Only one period available - use that score
          mdaData.yearlyAverage = mdaData.periods[0].score;
        }
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
    // First get the MDA ID from the name using flexible matching
    const mda = await findMdaByName(ctx, mdaName);
    
    if (!mda) {
      return null;
    }
    
    // Calculate date range based on scoring period
    const currentYear = new Date().getFullYear();
    let startDate: number, endDate: number;
    
    // Extract year from scoring period (e.g., "1st Half 2024" -> 2024)
    const yearMatch = scoringPeriod.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
    
    if (scoringPeriod.includes("1st Half")) {
      startDate = new Date(targetYear, 0, 1).getTime(); // January 1
      endDate = new Date(targetYear, 5, 30, 23, 59, 59).getTime();   // June 30 end of day
    } else if (scoringPeriod.includes("2nd Half")) {
      startDate = new Date(targetYear, 6, 1).getTime();  // July 1
      endDate = new Date(targetYear, 11, 31, 23, 59, 59).getTime();  // December 31 end of day
    } else {
      // Default - use current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    }
    
    // Get all tickets for this MDA first
    const allTickets = await ctx.db.query("tickets")
      .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
      .collect();
    
    // Filter tickets by date range in memory (more flexible and accurate)
    const filteredTickets = allTickets.filter(ticket => 
      ticket.createdAt >= startDate && ticket.createdAt <= endDate
    );
    
    // Debug logging
    console.log(`MDA: ${mdaName}, Period: ${scoringPeriod}`);
    console.log(`Target Year: ${targetYear}`);
    console.log(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
    console.log(`Total tickets for MDA: ${allTickets.length}`);
    console.log(`Filtered tickets for period: ${filteredTickets.length}`);
    console.log(`Sample ticket dates:`, allTickets.slice(0, 3).map(t => ({
      id: t._id,
      createdAt: new Date(t.createdAt).toLocaleDateString(),
      status: t.status
    })));
    
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
      endDate,
      dateRange: {
        start: new Date(startDate).toLocaleDateString(),
        end: new Date(endDate).toLocaleDateString()
      }
    };
  }
});

// Get latest scores for all MDAs from scoring history
export const getAllMDAsLatestScores = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const targetYear = year || new Date().getFullYear();
    // Get all unique MDA names from scoring history
    const allScoringHistory = await ctx.db.query("mda_scoring_history").collect();
    const uniqueMdaNames = [...new Set(allScoringHistory.map(score => score.mdaName))];
    
    // Get MDAs from mdas table
    const mdas = await ctx.db.query("mdas").collect();
    const mdaNamesFromTable = mdas.map(mda => mda.name);
    
    // Combine all MDA names (from table + from scoring history)
    const allMdaNames = [...new Set([...mdaNamesFromTable, ...uniqueMdaNames])];
    
    const mdasWithLatestScores = await Promise.all(
      allMdaNames.map(async (mdaName) => {
        // Find MDA in table if it exists
        const mda = mdas.find(m => m.name === mdaName);
        
        // Get all scores for this MDA (by name, since mdaId might be null)
        const allScores = await ctx.db.query("mda_scoring_history")
          .withIndex("byMdaName", q => q.eq("mdaName", mdaName))
          .order("desc")
          .collect();
        
        if (allScores.length === 0) {
          return {
            mdaId: mda?._id || null,
            mdaName: mdaName,
            isActiveOnPlatform: !!mda,
            currentScore: 0,
            grade: "N/A",
            status: "Not Scored",
            lastScoredAt: null,
            scoringPeriod: "N/A"
          };
        }
        
        // Get target year scores
        const targetYearScores = allScores.filter(score => {
          const scoreYear = new Date(score.scoredAt).getFullYear();
          return scoreYear === targetYear;
        });
        
        let rankingScore = 0;
        let latestScore = allScores[0]; // Most recent score for display
        let grade = latestScore.grade;
        let status = latestScore.status;
        let lastScoredAt = latestScore.scoredAt;
        let scoringPeriod = latestScore.scoringPeriod;
        
        if (targetYearScores.length > 0) {
          // Check if we have both 1st and 2nd half scores for target year
          const firstHalf = targetYearScores.find(s => s.scoringPeriod.includes('1st Half'));
          const secondHalf = targetYearScores.find(s => s.scoringPeriod.includes('2nd Half'));
          
          if (firstHalf && secondHalf) {
            // Both periods available - use average for ranking
            rankingScore = (firstHalf.totalPercentage + secondHalf.totalPercentage) / 2;
            // Use the most recent score for grade/status display
            grade = latestScore.grade;
            status = latestScore.status;
            scoringPeriod = `${firstHalf.scoringPeriod} & ${secondHalf.scoringPeriod}`;
          } else {
            // Only one period available - use that score for ranking
            rankingScore = targetYearScores[0].totalPercentage;
            grade = targetYearScores[0].grade;
            status = targetYearScores[0].status;
            lastScoredAt = targetYearScores[0].scoredAt;
            scoringPeriod = targetYearScores[0].scoringPeriod;
          }
        } else {
          // No target year scores, use latest score
          rankingScore = latestScore.totalPercentage;
        }
        
        return {
          mdaId: mda?._id || null,
          mdaName: mdaName,
          isActiveOnPlatform: !!mda,
          currentScore: rankingScore,
          grade: grade,
          status: status,
          lastScoredAt: lastScoredAt,
          scoringPeriod: scoringPeriod,
          maxPossiblePoints: latestScore?.maxPossiblePoints ?? 100,
          scoringMethod: latestScore?.scoringMethod ?? "standard"
        };
      })
    );
    
    // Sort by current score (highest first)
    return mdasWithLatestScores.sort((a, b) => b.currentScore - a.currentScore);
  }
});

// Get MDA leaderboard with latest scores
export const getMDALeaderboard = query({
  args: {
    limit: v.optional(v.number()),
    year: v.optional(v.number())
  },
  handler: async (ctx, { limit = 10, year }) => {
    const mdasWithScores = await getAllMDAsLatestScores(ctx, { year });
    return mdasWithScores.slice(0, limit);
  }
});

// Check if an MDA already has a score for a specific period
export const checkMdaScoringStatus = query({
  args: { 
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    // Check if this MDA already has a score for this specific period
    const existingScore = await ctx.db.query("mda_scoring_history")
      .withIndex("byMdaName", q => q.eq("mdaName", mdaName))
      .filter(q => q.eq(q.field("scoringPeriod"), scoringPeriod))
      .first();
    
    return {
      hasScore: !!existingScore,
      existingScore: existingScore ? {
        totalPercentage: existingScore.totalPercentage,
        grade: existingScore.grade,
        status: existingScore.status,
        scoredAt: existingScore.scoredAt
      } : null
    };
  }
});

// Helper function to sanitize MDA names for use as object keys
function sanitizeMdaName(mdaName: string): string {
  return mdaName
    .replace(/[–—]/g, '-') // Replace em dash and en dash with regular dash
    .replace(/[^\w\s-]/g, '') // Remove all non-word characters except spaces and dashes
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '_') // Replace multiple dashes with underscores
    .toLowerCase();
}

// Get all MDA scoring statuses for a specific period
export const getAllMdaScoringStatuses = query({
  args: { 
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    // Get all scoring history for this specific period
    const periodScores = await ctx.db.query("mda_scoring_history")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", scoringPeriod))
      .collect();
    
    // Create an object of sanitized MDA names to their scores for this period
    const mdaScoresObject: { [key: string]: any } = {};
    periodScores.forEach(score => {
      const sanitizedKey = sanitizeMdaName(score.mdaName);
      mdaScoresObject[sanitizedKey] = {
        originalName: score.mdaName, // Keep original name for reference
        totalPercentage: score.totalPercentage,
        grade: score.grade,
        status: score.status,
        scoredAt: score.scoredAt
      };
    });
    
    return mdaScoresObject;
  }
});

// Migration function to update existing records with default values
export const migrateScoringHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Only admins can run migrations
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can run migrations");
    }
    
    // Get all scoring history records
    const allRecords = await ctx.db.query("mda_scoring_history").collect();
    
    let updatedCount = 0;
    
    for (const record of allRecords) {
      // Check if record needs migration
      if (record.maxPossiblePoints === undefined || record.scoringMethod === undefined) {
        await ctx.db.patch(record._id, {
          maxPossiblePoints: record.maxPossiblePoints ?? 100,
          scoringMethod: record.scoringMethod ?? "standard"
        });
        updatedCount++;
      }
    }
    
    return {
      success: true,
      updatedRecords: updatedCount,
      totalRecords: allRecords.length
    };
  }
});

// Debug function to check ticket dates for a specific MDA
export const debugTicketDates = query({
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
      return { error: "MDA not found" };
    }
    
    // Get all tickets for this MDA
    const allTickets = await ctx.db.query("tickets")
      .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
      .collect();
    
    // Calculate date range based on scoring period
    const currentYear = new Date().getFullYear();
    const yearMatch = scoringPeriod.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
    
    let startDate: number, endDate: number;
    
    if (scoringPeriod.includes("1st Half")) {
      startDate = new Date(targetYear, 0, 1).getTime(); // January 1
      endDate = new Date(targetYear, 5, 30, 23, 59, 59).getTime();   // June 30 end of day
    } else if (scoringPeriod.includes("2nd Half")) {
      startDate = new Date(targetYear, 6, 1).getTime();  // July 1
      endDate = new Date(targetYear, 11, 31, 23, 59, 59).getTime();  // December 31 end of day
    } else {
      // Default - use current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    }
    
    // Filter tickets by date range
    const filteredTickets = allTickets.filter(ticket => 
      ticket.createdAt >= startDate && ticket.createdAt <= endDate
    );
    
    return {
      mdaName,
      scoringPeriod,
      targetYear,
      dateRange: {
        start: new Date(startDate).toLocaleDateString(),
        end: new Date(endDate).toLocaleDateString()
      },
      totalTickets: allTickets.length,
      filteredTickets: filteredTickets.length,
      allTicketDates: allTickets.map(t => ({
        id: t._id,
        createdAt: new Date(t.createdAt).toLocaleDateString(),
        createdAtTimestamp: t.createdAt,
        status: t.status
      })),
      filteredTicketDates: filteredTickets.map(t => ({
        id: t._id,
        createdAt: new Date(t.createdAt).toLocaleDateString(),
        createdAtTimestamp: t.createdAt,
        status: t.status
      }))
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

// Save SLA data for a specific MDA and period
export const saveSLAData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    monthlySlaData: v.any(), // The monthly SLA data object
    totalScore: v.number(),
    monthsWithData: v.number(),
    totalMonths: v.number(),
    percentage: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, monthlySlaData, totalScore, monthsWithData, totalMonths, percentage }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Check if SLA data already exists for this MDA and period
    const existingSla = await ctx.db.query("mda_sla_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
    
    if (existingSla) {
      // Update existing record
      await ctx.db.patch(existingSla._id, {
        monthlySlaData,
        totalScore,
        monthsWithData,
        totalMonths,
        percentage,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      // Create new record
      await ctx.db.insert("mda_sla_data", {
        mdaName,
        scoringPeriod,
        monthlySlaData,
        totalScore,
        monthsWithData,
        totalMonths,
        percentage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }
    
    return { success: true, message: "SLA data saved successfully" };
  }
});

// Get SLA data for a specific MDA and period
export const getSLAData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const slaData = await ctx.db.query("mda_sla_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
    
    return slaData;
  }
});

// Save Report Governance Resolution data for a specific MDA and period
export const saveReportGovData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    totalTickets: v.number(),
    resolvedTickets: v.number(),
    averageResponseTime: v.number(),
    averageResolutionTime: v.number(),
    resolutionRate: v.number(),
    score: v.number(),
    isManual: v.boolean()
  },
  handler: async (ctx, { mdaName, scoringPeriod, totalTickets, resolvedTickets, averageResponseTime, averageResolutionTime, resolutionRate, score, isManual }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Check if Report Gov data already exists for this MDA and period
    const existingReportGov = await ctx.db.query("mda_reportgov_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
    
    if (existingReportGov) {
      // Update existing record
      await ctx.db.patch(existingReportGov._id, {
        totalTickets,
        resolvedTickets,
        averageResponseTime,
        averageResolutionTime,
        resolutionRate,
        score,
        isManual,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      // Create new record
      await ctx.db.insert("mda_reportgov_data", {
        mdaName,
        scoringPeriod,
        totalTickets,
        resolvedTickets,
        averageResponseTime,
        averageResolutionTime,
        resolutionRate,
        score,
        isManual,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }
    
    return { success: true, message: "Report Governance data saved successfully" };
  }
});

// Get Report Governance Resolution data for a specific MDA and period
export const getReportGovData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const reportGovData = await ctx.db.query("mda_reportgov_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
    
    return reportGovData;
  }
});

// Save Mystery Shopping data for a specific MDA and period
export const saveMysteryShoppingData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    mysteryType: v.string(),
    ratings: v.any(),
    totalScore: v.number(),
    maxPossibleScore: v.number(),
    percentage: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, mysteryType, ratings, totalScore, maxPossibleScore, percentage }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Check if Mystery Shopping data already exists for this MDA and period
    const existingMysteryData = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
    
    if (existingMysteryData) {
      // Update existing record
      await ctx.db.patch(existingMysteryData._id, {
        mysteryType,
        ratings,
        totalScore,
        maxPossibleScore,
        percentage,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      // Create new record
      await ctx.db.insert("mda_mystery_shopping_data", {
        mdaName,
        scoringPeriod,
        mysteryType,
        ratings,
        totalScore,
        maxPossibleScore,
        percentage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }
    
    return { success: true, message: "Mystery Shopping data saved successfully" };
  }
});

// Get Mystery Shopping data for a specific MDA and period
export const getMysteryShoppingData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const mysteryData = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
    
    return mysteryData;
  }
});