import { mdasList } from "@/components/mdaList";
import { stateRegions } from "@/lib/stateRegions";
import {
    STATE_ALIAS_MAP,
    INVALID_STATE_LABELS,
    HAS_REPORTGOV_QUESTIONS,
    NO_REPORTGOV_QUESTIONS
} from "./constants";
import { MysteryShoppingType, MysteryRatings } from "./types";

/**
 * Normalize state label for consistency
 */
export const normalizeStateLabel = (raw?: string): string | null => {
    if (!raw) return null;
    const trimmed = raw.replace(/[–—]/g, "-").trim();
    if (!trimmed) return null;

    const normalizedWhitespace = trimmed
        .replace(/\bstate of\s+/i, "")
        .replace(/\bthe state of\s+/i, "")
        .replace(/\bstate\b$/i, "")
        .replace(/\s+/g, " ")
        .trim();
    const upper = normalizedWhitespace.toUpperCase();

    if (INVALID_STATE_LABELS.has(upper)) {
        return null;
    }

    if (STATE_ALIAS_MAP[upper]) {
        return STATE_ALIAS_MAP[upper];
    }

    const lower = normalizedWhitespace.toLowerCase();
    const titleCased = lower.replace(/\b\w/g, (char) => char.toUpperCase());
    return stateRegions[titleCased] ? titleCased : null;
};

/**
 * Sanitize MDA names (same as backend)
 */
export const sanitizeMdaName = (mdaName: string): string => {
    return mdaName
        .replace(/[–—]/g, '-') // Replace em dash and en dash with regular dash
        .replace(/[^\w\s-]/g, '') // Remove all non-word characters except spaces and dashes
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/-+/g, '_') // Replace multiple dashes with underscores
        .toLowerCase();
};

/**
 * Strip abbreviation prefix from MDA names (e.g., "FME - Federal Ministry" -> "Federal Ministry")
 */
export const stripAbbreviation = (mdaName: string): string => {
    if (!mdaName) return mdaName;
    // Remove pattern like "ABC - " or "ABC -" from the start
    const match = mdaName.match(/^[A-Z]+ - (.+)$/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return mdaName.trim();
};

/**
 * Normalize MDA names for comparison (removes extra spaces, handles variations)
 */
export const normalizeMdaName = (mdaName: string): string => {
    if (!mdaName) return '';
    return mdaName
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[–—]/g, '-') // Replace em dash and en dash with regular dash
        .toLowerCase();
};

/**
 * Find matching MDA from mdasList given a backend MDA name
 */
export const findMatchingMdaName = (backendMdaName: string): string | null => {
    if (!backendMdaName) return null;

    const normalizedBackend = normalizeMdaName(backendMdaName);
    const strippedBackend = normalizeMdaName(stripAbbreviation(backendMdaName));

    // Try to find exact match first
    for (const mda of mdasList) {
        const normalizedList = normalizeMdaName(mda.name);
        const strippedList = normalizeMdaName(stripAbbreviation(mda.name));

        // Exact match (case-insensitive, normalized)
        if (normalizedList === normalizedBackend) {
            return mda.name;
        }

        // Match after stripping abbreviations from both
        if (strippedList === strippedBackend && strippedList.length > 0) {
            return mda.name;
        }

        // Match backend stripped against list full name
        if (strippedBackend === normalizedList && strippedBackend.length > 0) {
            return mda.name;
        }

        // Match backend full name against list stripped
        if (normalizedBackend === strippedList && strippedList.length > 0) {
            return mda.name;
        }
    }

    return null;
};

/**
 * Check if an MDA is a ministry
 */
export const isMinistry = (mdaName: string): boolean => {
    if (!mdaName) return false;
    const lowerName = mdaName.toLowerCase();
    return lowerName.includes('ministry') || lowerName.includes('minister');
};

/**
 * Header matching function for SLA data processing
 */
export const performHeaderMatching = (headers: string[]) => {
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

    return {
        headerMapping: mapping,
        confidence: Object.fromEntries(
            Object.entries(mapping).map(([key, value]) => [key, value ? 0.8 : 0])
        ),
        suggestions: ["Using intelligent header matching. AI features coming soon!"],
        success: true
    };
};

/**
 * Calculate working days between two dates
 */
export const calculateWorkingDays = (startDate: any, endDate: any): number | null => {
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
        return null;
    }

    try {
        let start: Date;
        let end: Date;

        if (startDate.includes('/') && startDate.split('/').length === 3) {
            const [startDay, startMonth, startYear] = startDate.split('/').map(Number);
            const [endDay, endMonth, endYear] = endDate.split('/').map(Number);

            start = new Date(startYear, startMonth - 1, startDay);
            end = new Date(endYear, endMonth - 1, endDay);
        } else {
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
            if (day !== 0 && day !== 6) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    } catch (error) {
        console.error("Date calculation error:", error);
        return null;
    }
};

/**
 * Parse timeline string to extract number
 */
export const parseTimeline = (timelineStr: any): number | null => {
    if (!timelineStr) return null;

    try {
        const match = String(timelineStr).match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    } catch (error) {
        console.error("Timeline parsing error:", error);
        return null;
    }
};

/**
 * Calculate performance percentage based on actual vs expected days
 */
export const calculatePerformance = (actualDays: number | null, expectedDays: number | null): number | null => {
    if (actualDays === null || expectedDays === null) return null;

    if (actualDays <= expectedDays) {
        return 100;
    } else {
        const daysOver = actualDays - expectedDays;
        const percentage = 100 - (daysOver * 0.5);
        return Math.max(0, percentage);
    }
};

/**
 * Calculate mystery shopping score based on ratings
 */
export const calculateMysteryScore = (
    mysteryType: MysteryShoppingType,
    mysteryRatings: MysteryRatings
): number => {
    const questions = mysteryType === 'hasReportGov' ? HAS_REPORTGOV_QUESTIONS : NO_REPORTGOV_QUESTIONS;

    let totalScore = 0;
    let maxPossibleScore = 0;

    questions.forEach(question => {
        const rating = mysteryRatings[question.key] || 0;

        if (question.type === 'rating') {
            // Rating questions: scale 0-5 to 0-1 point each
            totalScore += (rating / 5) * 1;
            maxPossibleScore += 1;
        } else {
            // Yes/No questions: 1 point for Yes, 0 for No
            totalScore += rating;
            maxPossibleScore += 1;
        }
    });

    // Scale to 20 points total
    const scaledScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 20 : 0;
    return Math.min(scaledScore, 20); // Cap at 20
};

/**
 * Get months for a scoring period
 */
export const getMonthsForPeriod = (period: string): Array<{ month: number; year: number }> => {
    const currentYear = new Date().getFullYear();

    // Extract year from scoring period (e.g., "1st Half 2024" -> 2024)
    const yearMatch = period.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;

    if (period.includes("1st Half")) {
        return [
            { month: 0, year: targetYear },   // January
            { month: 1, year: targetYear },   // February
            { month: 2, year: targetYear },   // March
            { month: 3, year: targetYear },   // April
            { month: 4, year: targetYear },   // May
            { month: 5, year: targetYear }    // June
        ];
    } else if (period.includes("2nd Half")) {
        return [
            { month: 6, year: targetYear },   // July
            { month: 7, year: targetYear },   // August
            { month: 8, year: targetYear },   // September
            { month: 9, year: targetYear },   // October
            { month: 10, year: targetYear },  // November
            { month: 11, year: targetYear }   // December
        ];
    } else {
        // Default: From January to current month of target year
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const months: Array<{ month: number; year: number }> = [];
        for (let month = 0; month <= currentMonth; month++) {
            months.push({ month, year: targetYear });
        }
        return months;
    }
};
