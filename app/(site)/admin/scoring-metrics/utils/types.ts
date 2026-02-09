// Transparency items state
export type TransparencyItemsState = {
    serviceLevelPublishing: boolean;
};

// Monthly SLA data structure
export type MonthlySlaData = {
    [key: string]: {
        method: 'file' | 'rating';
        file: File | null;
        rating: number;
        score: number;
        results: any[];
        overallPercentage: number | null;
    }
};

// Mystery shopping types
export type MysteryShoppingType = 'hasReportGov' | 'noReportGov';

export type MysteryRatings = {
    [key: string]: number;
};

// Scoring period types
export type ScoringHalf = '1st Half' | '2nd Half';

// Filter types
export type MdaFilterType = 'all' | 'withData';
export type MinistryFilterType = 'all' | 'ministries-only' | 'without-ministries';

// Result table props
export interface ResultTableProps {
    results: any[];
    overallPercentage: number | null;
}

// Monthly report and timeliness overrides
export type MonthlyOverrides = {
    [key: string]: boolean;
};
