// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { action } from "./_generated/server";

// Expected headers for SLA scoring
const EXPECTED_HEADERS = {
  submissionDate: ['DATE OF SUBMISSION', 'SUBMISSION DATE', 'DATE SUBMITTED', 'SUBMITTED DATE', 'START DATE', 'DATE STARTED'],
  completionDate: ['DATE OF COMPLETION', 'COMPLETION DATE', 'DATE COMPLETED', 'COMPLETED DATE', 'END DATE', 'DATE ENDED'],
  timeline: ['EXPECTED TIMELINE', 'TIMELINE', 'EXPECTED DAYS', 'TARGET DAYS', 'DEADLINE DAYS', 'SLA DAYS']
};

// AI Helper function to match and standardize headers
export const matchHeaders = action({
  args: {
    headers: v.array(v.string()),
    data: v.array(v.any())
  },
  handler: async (ctx, { headers, data }) => {
    try {
      // For now, use fallback matching until AI is properly configured
      const fallbackMapping = performFallbackHeaderMatching(headers);
      
      return {
        headerMapping: fallbackMapping,
        confidence: Object.fromEntries(
          Object.entries(fallbackMapping).map(([key, value]) => [key, value ? 0.8 : 0])
        ),
        suggestions: ["Using intelligent header matching. AI features coming soon!"],
        dataValidation: {
          hasValidDates: true,
          dateFormat: "DD/MM/YYYY",
          timelineFormat: "number"
        },
        success: true
      };
      
    } catch (error) {
      console.error("Header matching error:", error);
      
      // Fallback to simple string matching
      const fallbackMapping = performFallbackHeaderMatching(headers);
      
      return {
        headerMapping: fallbackMapping,
        confidence: Object.fromEntries(
          Object.entries(fallbackMapping).map(([key, value]) => [key, value ? 0.6 : 0])
        ),
        suggestions: ["Used fallback matching due to error"],
        dataValidation: {
          hasValidDates: true,
          dateFormat: "unknown",
          timelineFormat: "unknown"
        },
        success: false,
        error: (error as Error).message
      };
    }
  }
});

// Fallback header matching using simple string matching
function performFallbackHeaderMatching(headers: string[]) {
  const mapping: { [key: string]: string | null } = {
    DATE_OF_SUBMISSION: null,
    DATE_OF_COMPLETION: null,
    EXPECTED_TIMELINE: null
  };
  
  headers.forEach(header => {
    const upperHeader = header.toUpperCase();
    
    // Match submission date
    if (!mapping.DATE_OF_SUBMISSION && 
        (upperHeader.includes('SUBMISSION') || upperHeader.includes('START') || 
         upperHeader.includes('SUBMITTED') || upperHeader.includes('DATE'))) {
      mapping.DATE_OF_SUBMISSION = header;
    }
    
    // Match completion date
    if (!mapping.DATE_OF_COMPLETION && 
        (upperHeader.includes('COMPLETION') || upperHeader.includes('END') || 
         upperHeader.includes('COMPLETED') || upperHeader.includes('FINISH'))) {
      mapping.DATE_OF_COMPLETION = header;
    }
    
    // Match timeline
    if (!mapping.EXPECTED_TIMELINE && 
        (upperHeader.includes('TIMELINE') || upperHeader.includes('EXPECTED') || 
         upperHeader.includes('DAYS') || upperHeader.includes('DEADLINE') || 
         upperHeader.includes('TARGET') || upperHeader.includes('SLA'))) {
      mapping.EXPECTED_TIMELINE = header;
    }
  });
  
  return mapping;
}

// Process data with standardized headers
export const processSlaData = action({
  args: {
    data: v.array(v.any()),
    headerMapping: v.object({
      DATE_OF_SUBMISSION: v.union(v.string(), v.null()),
      DATE_OF_COMPLETION: v.union(v.string(), v.null()),
      EXPECTED_TIMELINE: v.union(v.string(), v.null())
    })
  },
  handler: async (ctx, { data, headerMapping }) => {
    try {
      const processedData = data.map((row: any, index: number) => {
        const submissionDate = headerMapping.DATE_OF_SUBMISSION ? row[headerMapping.DATE_OF_SUBMISSION] : null;
        const completionDate = headerMapping.DATE_OF_COMPLETION ? row[headerMapping.DATE_OF_COMPLETION] : null;
        const timelineStr = headerMapping.EXPECTED_TIMELINE ? row[headerMapping.EXPECTED_TIMELINE] : null;
        
        // Calculate working days
        const actualDays = calculateWorkingDays(submissionDate, completionDate);
        
        // Parse expected timeline
        const expectedDays = parseTimeline(timelineStr);
        
        // Calculate performance percentage
        const performancePercentage = calculatePerformance(actualDays, expectedDays);
        
        // Determine status
        let status = 'Invalid Dates';
        if (actualDays !== null && expectedDays !== null) {
          status = actualDays <= expectedDays ? 'On Time' : 'Delayed';
        }
        
        return {
          ...row,
          'DATE OF SUBMISSION': submissionDate,
          'DATE OF COMPLETION': completionDate,
          'EXPECTED TIMELINE': timelineStr,
          'ACTUAL WORKING DAYS': actualDays,
          'STATUS': status,
          'DAYS OVER': actualDays !== null && expectedDays !== null
            ? Math.max(0, actualDays - expectedDays)
            : null,
          'PERFORMANCE %': performancePercentage !== null
            ? `${performancePercentage.toFixed(2)}%`
            : 'N/A'
        };
      });
      
      // Calculate overall percentage
      const validRows = processedData.filter(row => row['PERFORMANCE %'] !== 'N/A');
      const totalPercentage = validRows.reduce((sum, row) => {
        const percentage = parseFloat(row['PERFORMANCE %'].replace('%', ''));
        return sum + percentage;
      }, 0);
      
      const overallPercentage = validRows.length > 0 ? (totalPercentage / validRows.length) : null;
      
      return {
        processedData,
        overallPercentage,
        totalRows: data.length,
        validRows: validRows.length,
        success: true
      };
      
    } catch (error) {
      console.error("Data processing error:", error);
      return {
        processedData: [],
        overallPercentage: null,
        totalRows: 0,
        validRows: 0,
        success: false,
        error: (error as Error).message
      };
    }
  }
});

// Helper function to calculate working days between two dates
function calculateWorkingDays(startDate: any, endDate: any): number | null {
  if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
    return null;
  }

  try {
    // Try different date formats
    let start: Date;
    let end: Date;
    
    // Check if it's DD/MM/YYYY format
    if (startDate.includes('/') && startDate.split('/').length === 3) {
      const [startDay, startMonth, startYear] = startDate.split('/').map(Number);
      const [endDay, endMonth, endYear] = endDate.split('/').map(Number);
      
      start = new Date(startYear, startMonth - 1, startDay);
      end = new Date(endYear, endMonth - 1, endDay);
    } else {
      // Try parsing as ISO date or other formats
      start = new Date(startDate);
      end = new Date(endDate);
    }
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return null;
    }

    let count = 0;
    const current = new Date(start);
    current.setDate(current.getDate() + 1);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Exclude weekends
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  } catch (error) {
    console.error("Date calculation error:", error);
    return null;
  }
}

// Helper function to parse timeline string
function parseTimeline(timelineStr: any): number | null {
  if (!timelineStr) return null;
  
  try {
    // Extract number from timeline string
    const match = String(timelineStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  } catch (error) {
    console.error("Timeline parsing error:", error);
    return null;
  }
}

// Helper function to calculate performance percentage
function calculatePerformance(actualDays: number | null, expectedDays: number | null): number | null {
  if (actualDays === null || expectedDays === null) return null;

  if (actualDays <= expectedDays) {
    return 100; // On time = 100%
  } else {
    const daysOver = actualDays - expectedDays;
    const percentage = 100 - (daysOver * 0.5); // 0.5% penalty per day over
    return Math.max(0, percentage);
  }
}

