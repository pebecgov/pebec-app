import { indicators } from "@/convex/config/indicators";
import { stateRegions } from "@/lib/stateRegions";

// State indicator max scores calculation
export const stateIndicatorMaxScores: Record<string, number> = Object.fromEntries(
    Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
        const maxScoreForIndicator = Object.values(indicatorConfig.subIndicators).reduce(
            (sum, subIndicator: any) => {
                const options = (subIndicator.options as Array<{ score: number }>) || [];
                const maxOptionScore = options.reduce(
                    (max, option) => Math.max(max, option.score ?? 0),
                    0
                );
                return sum + maxOptionScore;
            },
            0
        );
        return [indicatorKey, maxScoreForIndicator];
    })
);

export const STATE_OVERALL_MAX_SCORE = Object.values(stateIndicatorMaxScores).reduce(
    (sum, value) => sum + value,
    0
);

// State alias mappings
export const STATE_ALIAS_OVERRIDES: Record<string, string> = {
    FCT: "Federal Capital Territory",
    "FEDERAL CAPITAL TERRITORY": "Federal Capital Territory",
    ABUJA: "Federal Capital Territory",
    "F.C.T": "Federal Capital Territory",
};

export const STATE_ALIAS_MAP: Record<string, string> = (() => {
    const map: Record<string, string> = { ...STATE_ALIAS_OVERRIDES };
    Object.keys(stateRegions).forEach((state) => {
        const upper = state.toUpperCase();
        map[upper] = state;
        map[`${upper} STATE`] = state;
        map[upper.replace(/\s+/g, "")] = state;
        map[upper.replace(/\s+/g, "-")] = state;
    });
    return map;
})();

// Scorecard calculation constants
export const SCORECARD_MULTIPLIER = 1; // Weight multiplier for Bayesian averaging
export const SCORECARD_AVERAGE_TICKET_WEIGHT = 100; // Average ticket weight (percentage)

// Invalid state labels
export const INVALID_STATE_LABELS = new Set([
    "DATA SOURCES",
    "DATA SOURCE",
    "SOURCES",
    "SOURCE",
    "N/A",
    "NOT APPLICABLE",
]);

// Mystery Shopping Rating Options
export const RATING_OPTIONS = [
    { value: 0, label: 'No Response' },
    { value: 1, label: 'POOR' },
    { value: 2, label: 'FAIR' },
    { value: 3, label: 'AVERAGE' },
    { value: 4, label: 'GOOD' },
    { value: 5, label: 'EXCELLENT' }
];

export const YES_NO_OPTIONS = [
    { value: 0, label: 'No' },
    { value: 1, label: 'Yes' }
];

// Mystery Shopping Questions
export const HAS_REPORTGOV_QUESTIONS = [
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

export const NO_REPORTGOV_QUESTIONS = [
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
