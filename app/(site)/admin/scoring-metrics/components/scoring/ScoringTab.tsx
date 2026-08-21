'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

// Components
import MDASelector from './MDASelector';
import MDAStatusDisplay from './MDAStatusDisplay';
import ScoringPeriodInfo from './ScoringPeriodInfo';
import PastPerformanceInfo from './PastPerformanceInfo';
import SLAMetricCard from './SLAMetricCard';
import MysteryShoppingCard from './MysteryShoppingCard';
import BooleanMetricCard from './BooleanMetricCard';
import StakeholderCard from './StakeholderCard';
import TransparencyCard from './TransparencyCard';
import ReportGovCard from './ReportGovCard';
import MonthlyReportCard from './MonthlyReportCard';
import TimelinessCard from './TimelinessCard';
import FinalScoreButton from './FinalScoreButton';
import DynamicOthersCard from './DynamicOthersCard';
import DynamicPenaltiesCard from './DynamicPenaltiesCard';
import DynamicBonusesCard from './DynamicBonusesCard';

// Modals
import { MysteryShoppingModal } from '../modals/MysteryShoppingModal';
import MonthlySLAModal from '../modals/MonthlySLAModal';
import FinalScoreModal from '../modals/FinalScoreModal';
import {
    MysteryShoppingRankingModal,
    SLARankingModal,
    ReportGovRankingModal
} from '../modals/RankingModals';

// Utils
import {
    HAS_REPORTGOV_QUESTIONS,
    NO_REPORTGOV_QUESTIONS,
    YES_NO_OPTIONS,
    RATING_OPTIONS
} from "../../utils/constants";
import {
    TransparencyItemsState,
    MonthlySlaData,
    MysteryShoppingType
} from "../../utils/types";
import {
    sanitizeMdaName,
    calculateMysteryScore,
    getMonthsForPeriod,
    isMinistry
} from "../../utils/helpers";

interface ScoringTabProps {
    mdasList: any[];
    mdasWithScores: any[];
    scoringPeriod: string;
    currentYear: number;
    userRole: string | undefined;
}

const transparencyQuestions = [
    { key: 'serviceLevelPublishing', label: 'Service Level Agreement Publishing' },
];

export default function ScoringTab({
    mdasList,
    mdasWithScores,
    scoringPeriod,
    currentYear,
    userRole
}: ScoringTabProps) {
    const convex = useConvex();

    // --- State ---
    const [selectedMda, setSelectedMda] = useState('');

    // Scoring Data States
    const [notes, setNotes] = useState('');
    const [recommendations, setRecommendations] = useState('');

    // SLA State
    const [monthlySlaData, setMonthlySlaData] = useState<MonthlySlaData>({});

    // Mystery Shopping State
    const [mysteryRatings, setMysteryRatings] = useState<Record<string, number>>({});
    const [mysteryType, setMysteryType] = useState<string>('hasReportGov');

    // Boolean/Rate Metrics State
    const [isControversial, setIsControversial] = useState(false);
    const [isInnovation, setIsInnovation] = useState(false);
    const [isTouting, setIsTouting] = useState(false);
    const [stakeholderRate, setStakeholderRate] = useState(0);

    // Transparency State
    const [skipTransparency, setSkipTransparency] = useState(false);
    const [transparencyItems, setTransparencyItems] = useState<TransparencyItemsState>({
        serviceLevelPublishing: false,
    });

    // ReportGov State
    const [reportgovRate, setReportgovRate] = useState(0);
    const [skipReportGov, setSkipReportGov] = useState(false);

    // Monthly Report State
    const [manualMonthlyReports, setManualMonthlyReports] = useState<Record<string, boolean>>({});
    const [useManualMonthlyReports, setUseManualMonthlyReports] = useState(false);

    // Timeliness State
    const [manualTimeliness, setManualTimeliness] = useState<Record<string, boolean>>({});
    const [useManualTimeliness, setUseManualTimeliness] = useState(false);

    // Dynamic State for 2026+ (Others & Penalties)
    const [othersValues, setOthersValues] = useState<Record<string, boolean | number>>({});
    const [penaltyValues, setPenaltyValues] = useState<Record<string, boolean>>({});
    const [bonusValues, setBonusValues] = useState<Record<string, boolean>>({});

    // Modal Visibility
    const [showSlaModal, setShowSlaModal] = useState(false);
    const [showMysteryModal, setShowMysteryModal] = useState(false);
    const [showFinalScore, setShowFinalScore] = useState(false);

    // Ranking Modals
    const [showMysteryRanking, setShowMysteryRanking] = useState(false);
    const [showSLARanking, setShowSLARanking] = useState(false);
    const [showReportGovRanking, setShowReportGovRanking] = useState(false);

    // Dynamic Mutations
    const saveOthersItems = useMutation(api.mda_scoring.saveOthersData);
    const savePenaltiesItems = useMutation(api.mda_scoring.savePenaltiesData);
    const saveBonusesItems = useMutation(api.mda_scoring.saveBonusesData);

    // --- Year Detection & Configuration (2026+) ---
    const getScoringYear = (period: string): number => {
        const match = period.match(/\d{4}/);
        return match ? parseInt(match[0]) : currentYear;
    };
    const scoringYear = getScoringYear(scoringPeriod);
    const useDynamicConfig = scoringYear >= 2026;

    // Configuration Queries (2026+ only)
    const efficiencyConfig = useQuery(
        api.scoring_config.getEfficiencyPeriod,
        useDynamicConfig ? { year: scoringYear } : "skip"
    );
    const mysteryConfig = useQuery(
        api.scoring_config.getMysteryShoppingTypesWithQuestions,
        useDynamicConfig ? { year: scoringYear } : "skip"
    );
    const othersConfig = useQuery(
        api.scoring_config.getOthersItems,
        useDynamicConfig ? { year: scoringYear } : "skip"
    );
    const penaltyConfig = useQuery(
        api.scoring_config.getPenaltyItems,
        useDynamicConfig ? { year: scoringYear } : "skip"
    );
    const bonusConfig = useQuery(
        api.scoring_config.getBonusItems,
        useDynamicConfig ? { year: scoringYear } : "skip"
    );
    const mdaMetricExclusions = useQuery(
        api.scoring_config.getMdaMetricExclusions,
        selectedMda ? { year: scoringYear, mdaName: selectedMda } : "skip"
    );

    const excludedMetricSet = new Set<string>(mdaMetricExclusions?.excludedMetrics || []);
    const isMetricExcluded = (metricKey: string) => excludedMetricSet.has(metricKey);
    const isOthersItemExcluded = (itemId: string) =>
        excludedMetricSet.has("others") || excludedMetricSet.has(`others:${itemId}`);

    // Calculate Report Gov Points
    const reportGovPoints = useDynamicConfig
        ? (efficiencyConfig?.reportGovPoints ?? 15)
        : 15;

    // Helper to generate months from config
    const getMonthsFromConfig = (config: any): Array<{ month: number; year: number; monthName: string }> => {
        if (!config) return [];
        const months: Array<{ month: number; year: number; monthName: string }> = [];
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];

        const startMonthIndex = monthNames.indexOf(config.startMonth);
        let currentYear = config.startYear;
        let currentMonth = startMonthIndex;

        for (let i = 0; i < config.totalMonths; i++) {
            months.push({
                month: currentMonth,
                year: currentYear,
                monthName: `${monthNames[currentMonth]} ${currentYear}`
            });
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
        }
        return months;
    };

    // Get period months based on year
    const periodMonths = useDynamicConfig && efficiencyConfig
        ? getMonthsFromConfig(efficiencyConfig)
        : getMonthsForPeriod(scoringPeriod);

    // --- Queries ---
    const mdaScoringStatus = useQuery(
        api.mda_scoring.checkMdaScoringStatus,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const allMdaScoringStatuses = useQuery(
        api.mda_scoring.getAllMdaScoringStatuses,
        { scoringPeriod }
    );
    const savedSLAData = useQuery(
        api.mda_scoring.getSLAData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const pastScoringData = useQuery(
        api.mda_scoring.getPastScoringData,
        selectedMda ? { mdaName: selectedMda, currentPeriod: scoringPeriod } : "skip"
    );
    const ticketResolutionData = useQuery(
        api.mda_scoring.getPeriodTicketData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const realMonthlyReports = useQuery<any>(
        api.mda_scoring.getRealMonthlyReports,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );

    // --- Saved Data Queries ---
    const savedReportGovData = useQuery(
        api.mda_scoring.getReportGovData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedMysteryShoppingData = useQuery(
        api.mda_scoring.getMysteryShoppingData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedControversialData = useQuery(
        api.mda_scoring.getControversialData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedToutingRentseekingData = useQuery(
        api.mda_scoring.getToutingRentseekingData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedInnovationData = useQuery(
        api.mda_scoring.getInnovationData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedStakeholderData = useQuery(
        api.mda_scoring.getStakeholderData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedTransparencyData = useQuery(
        api.mda_scoring.getTransparencyData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedMonthlyReportData = useQuery(
        api.mda_scoring.getMonthlyReportData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedTimelinessData = useQuery(
        api.mda_scoring.getTimelinessData,
        selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );

    // Dynamic Data Queries (2026+)
    const savedOthersData = useQuery(
        api.mda_scoring.getOthersData,
        selectedMda && useDynamicConfig ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedPenaltiesData = useQuery(
        api.mda_scoring.getPenaltiesData,
        selectedMda && useDynamicConfig ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );
    const savedBonusesData = useQuery(
        api.mda_scoring.getBonusesData,
        selectedMda && useDynamicConfig ? { mdaName: selectedMda, scoringPeriod } : "skip"
    );

    // --- Loading States ---
    const isLoadingSLAData = !!selectedMda && savedSLAData === undefined;
    const isLoadingReportGovData = !!selectedMda && savedReportGovData === undefined;
    const isLoadingMysteryShoppingData = !!selectedMda && savedMysteryShoppingData === undefined;
    const isLoadingControversialData = !!selectedMda && savedControversialData === undefined;
    const isLoadingToutingRentseekingData = !!selectedMda && savedToutingRentseekingData === undefined;
    const isLoadingInnovationData = !!selectedMda && savedInnovationData === undefined;
    const isLoadingStakeholderData = !!selectedMda && savedStakeholderData === undefined;
    const isLoadingTransparencyData = !!selectedMda && savedTransparencyData === undefined;
    const isLoadingMonthlyReportData = !!selectedMda && savedMonthlyReportData === undefined;
    const isLoadingTimelinessData = !!selectedMda && savedTimelinessData === undefined;
    const isLoadingOthersData = !!selectedMda && useDynamicConfig && savedOthersData === undefined;
    const isLoadingPenaltiesData = !!selectedMda && useDynamicConfig && savedPenaltiesData === undefined;
    const isLoadingBonusesData = !!selectedMda && useDynamicConfig && savedBonusesData === undefined;

    // Leaderboard Queries for Ranking Modals
    const mysteryRankings = useQuery(api.mda_scoring.getMysteryShoppingRankings, { scoringPeriod });
    const slaRankings = useQuery(api.mda_scoring.getSLARankings, { scoringPeriod });
    const reportGovRankings = useQuery(api.mda_scoring.getReportGovRankings, { scoringPeriod });

    // --- Mutations ---
    const saveSLAData = useMutation(api.mda_scoring.saveSLAData);
    const saveMysteryData = useMutation(api.mda_scoring.saveMysteryData);
    const saveReportGovData = useMutation(api.mda_scoring.saveReportGovData);
    const saveMonthlyReportData = useMutation(api.mda_scoring.saveMonthlyReportData);
    const saveTimelinessData = useMutation(api.mda_scoring.saveTimelinessData);
    const saveControversialData = useMutation(api.mda_scoring.saveControversialData);
    const saveToutingData = useMutation(api.mda_scoring.saveToutingData);
    const saveInnovationData = useMutation(api.mda_scoring.saveInnovationData);
    const saveStakeholderData = useMutation(api.mda_scoring.saveStakeholderData);
    const saveTransparencyData = useMutation(api.mda_scoring.saveTransparencyData);
    const calculateScore = useMutation(api.mda_scoring.calculateAndSaveMDAScore);

    // --- Effects ---
    useEffect(() => {
        if (selectedMda) {
            // Reset local state when MDA changes
            setMonthlySlaData({});
            setMysteryRatings({});
            setTransparencyItems({ serviceLevelPublishing: false });
            setReportgovRate(0);
            setSkipReportGov(false);
            setManualMonthlyReports({});
            setUseManualMonthlyReports(false);
            setManualTimeliness({});
            setUseManualTimeliness(false);
            setIsControversial(false);
            setIsInnovation(false);
            setIsTouting(false);
            setStakeholderRate(0);
            setSkipTransparency(false);
            setNotes('');
            setRecommendations('');
        }
    }, [selectedMda, scoringPeriod]);

    // Populate SLA Data
    useEffect(() => {
        if (savedSLAData && savedSLAData.monthlySlaData && Object.keys(monthlySlaData).length === 0) {
            setMonthlySlaData(savedSLAData.monthlySlaData);
        }
    }, [savedSLAData]);

    // Populate Automated ReportGov Data
    useEffect(() => {
        if (ticketResolutionData) {
            const { resolutionRate, averageResponseTime, averageResolutionTime, totalTickets } = ticketResolutionData;

            // Weights logic
            // Resolution Rate: 46.67% of total
            // Response Time: 20% of total
            // Resolution Time: 33.33% of total

            const maxResRatePoints = reportGovPoints * 0.4667;
            const maxResponsePoints = reportGovPoints * 0.20;
            const maxResolutionTimePoints = reportGovPoints * 0.3333;



            let resRateScore = 0;
            let responseScore = 0;
            let resolutionTimeScore = 0;

            if (totalTickets > 0) {
                // Resolution Rate Scoring (Based on 7 tiers)
                // >= 100% : 7/7
                // 90-99%  : 6/7
                // 80-89%  : 5/7
                // 70-79%  : 4/7
                // 60-69%  : 3/7
                // 50-59%  : 2/7
                // 40-49%  : 1/7
                // < 40%   : 0
                if (resolutionRate >= 100) resRateScore = maxResRatePoints * (7 / 7);
                else if (resolutionRate >= 90) resRateScore = maxResRatePoints * (6 / 7);
                else if (resolutionRate >= 80) resRateScore = maxResRatePoints * (5 / 7);
                else if (resolutionRate >= 70) resRateScore = maxResRatePoints * (4 / 7);
                else if (resolutionRate >= 60) resRateScore = maxResRatePoints * (3 / 7);
                else if (resolutionRate >= 50) resRateScore = maxResRatePoints * (2 / 7);
                else if (resolutionRate >= 40) resRateScore = maxResRatePoints * (1 / 7);
                else resRateScore = 0;

                // Response Time Scoring (Base 3 tiers)
                // <= 24h : 3/3
                // <= 48h : 2/3
                // <= 72h : 1/3
                if (averageResponseTime > 0) {
                    if (averageResponseTime <= 24) responseScore = maxResponsePoints * (3 / 3);
                    else if (averageResponseTime <= 48) responseScore = maxResponsePoints * (2 / 3);
                    else if (averageResponseTime <= 72) responseScore = maxResponsePoints * (1 / 3);
                    else responseScore = 0;
                }

                // Resolution Time Scoring (Base 5 tiers)
                // <= 48h  : 5/5
                // <= 72h  : 4/5
                // <= 96h  : 3/5
                // <= 120h : 2/5
                // <= 144h : 1/5
                if (averageResolutionTime > 0) {
                    if (averageResolutionTime <= 48) resolutionTimeScore = maxResolutionTimePoints * (5 / 5);
                    else if (averageResolutionTime <= 72) resolutionTimeScore = maxResolutionTimePoints * (4 / 5);
                    else if (averageResolutionTime <= 96) resolutionTimeScore = maxResolutionTimePoints * (3 / 5);
                    else if (averageResolutionTime <= 120) resolutionTimeScore = maxResolutionTimePoints * (2 / 5);
                    else if (averageResolutionTime <= 144) resolutionTimeScore = maxResolutionTimePoints * (1 / 5);
                    else resolutionTimeScore = 0;
                }
            }



            const totalScore = resRateScore + responseScore + resolutionTimeScore;
            setReportgovRate(Math.min(totalScore, reportGovPoints));
        }
    }, [ticketResolutionData, reportGovPoints]);

    // Load saved Report Gov data when available
    useEffect(() => {
        if (!isLoadingReportGovData && savedReportGovData && selectedMda) {
            if (savedReportGovData.isSkipped) {
                setSkipReportGov(true);
            } else {
                setSkipReportGov(false);
                // For automated ReportGov, we always recalculate based on ticket data
                // instead of using the saved score, to ensure it reflects current data/config.
                // setReportgovRate(savedReportGovData.score); 
            }
            toast.success(`📊 Loaded saved Report Gov data for ${selectedMda}`);
        }
    }, [savedReportGovData, selectedMda, scoringPeriod, isLoadingReportGovData]);

    // Load saved Mystery Shopping data
    useEffect(() => {
        if (!isLoadingMysteryShoppingData && savedMysteryShoppingData && selectedMda) {
            const data = savedMysteryShoppingData as any;
            setMysteryType((data.mysteryType || data.type));
            setMysteryRatings(data.ratings || {});
            toast.success(`🛍️ Loaded saved Mystery Shopping data for ${selectedMda}`);
        }
    }, [savedMysteryShoppingData, selectedMda, scoringPeriod, isLoadingMysteryShoppingData]);

    // Auto-select first mystery type from config for 2026+
    useEffect(() => {
        if (useDynamicConfig && mysteryConfig && Array.isArray(mysteryConfig) && mysteryConfig.length > 0) {
            const firstTypeId = mysteryConfig[0].typeId || mysteryConfig[0].typeName;
            // Only auto-select if no saved data and current type doesn't match any config type
            const hasValidType = mysteryConfig.some((t: any) => (t.typeId || t.typeName) === mysteryType);
            if (!savedMysteryShoppingData && !hasValidType) {
                setMysteryType(firstTypeId);
            }
        }
    }, [useDynamicConfig, mysteryConfig, savedMysteryShoppingData]);

    // Load saved Controversial data
    useEffect(() => {
        if (!isLoadingControversialData && savedControversialData && selectedMda) {
            setIsControversial(savedControversialData.isControversial || false);
            toast.success(`⚠️ Loaded saved Controversial data for ${selectedMda}`);
        }
    }, [savedControversialData, selectedMda, scoringPeriod, isLoadingControversialData]);

    // Load saved Touting & Rentseeking data
    useEffect(() => {
        if (!isLoadingToutingRentseekingData && savedToutingRentseekingData && selectedMda) {
            const data = savedToutingRentseekingData as any;
            setIsTouting(data.isToutingRentseeking ?? data.isTouting ?? false);
            toast.success(`🚫 Loaded saved Touting & Rentseeking data for ${selectedMda}`);
        }
    }, [savedToutingRentseekingData, selectedMda, scoringPeriod, isLoadingToutingRentseekingData]);

    // Load saved Innovation data
    useEffect(() => {
        if (!isLoadingInnovationData && savedInnovationData && selectedMda) {
            setIsInnovation(savedInnovationData.isInnovative || false);
            toast.success(`💡 Loaded saved Innovation data for ${selectedMda}`);
        }
    }, [savedInnovationData, selectedMda, scoringPeriod, isLoadingInnovationData]);

    // Load saved Stakeholder Engagement data
    useEffect(() => {
        if (!isLoadingStakeholderData && savedStakeholderData && selectedMda) {
            setStakeholderRate(savedStakeholderData.rate || 0);
            toast.success(`👥 Loaded saved Stakeholder Engagement data for ${selectedMda}`);
        }
    }, [savedStakeholderData, selectedMda, scoringPeriod, isLoadingStakeholderData]);

    // Load saved Transparency data
    useEffect(() => {
        if (!selectedMda) return;
        if (!isLoadingTransparencyData && savedTransparencyData) {
            setSkipTransparency(savedTransparencyData.isSkipped || false);
            setTransparencyItems({
                serviceLevelPublishing: savedTransparencyData.responses?.serviceLevelPublishing || false,
            });
            toast.success(`🔍 Loaded saved Transparency data for ${selectedMda}`);
        }
    }, [savedTransparencyData, selectedMda, scoringPeriod, isLoadingTransparencyData]);

    // Load saved Monthly Report Submission data
    useEffect(() => {
        if (!isLoadingMonthlyReportData && savedMonthlyReportData && selectedMda) {
            setUseManualMonthlyReports(savedMonthlyReportData.useManual || false);
            setManualMonthlyReports(savedMonthlyReportData.manualMonthlyReports || {});
            toast.success(`📅 Loaded saved Monthly Report Submission data for ${selectedMda}`);
        }
    }, [savedMonthlyReportData, selectedMda, scoringPeriod, isLoadingMonthlyReportData]);

    // Load saved Timeliness data
    useEffect(() => {
        if (!isLoadingTimelinessData && savedTimelinessData && selectedMda) {
            setUseManualTimeliness(savedTimelinessData.useManual || false);
            setManualTimeliness(savedTimelinessData.manualTimeliness || {});
            toast.success(`⏰ Loaded saved Timeliness data for ${selectedMda}`);
        }
    }, [savedTimelinessData, selectedMda, scoringPeriod, isLoadingTimelinessData]);

    // Load saved Others data (2026+)
    useEffect(() => {
        if (!isLoadingOthersData && savedOthersData && selectedMda && useDynamicConfig) {
            setOthersValues(savedOthersData.values || {});
            // toast.success(`📊 Loaded saved Others data for ${selectedMda}`);
        }
    }, [savedOthersData, selectedMda, scoringPeriod, isLoadingOthersData, useDynamicConfig]);

    // Load saved Penalties data (2026+)
    useEffect(() => {
        if (!isLoadingPenaltiesData && savedPenaltiesData && selectedMda && useDynamicConfig) {
            setPenaltyValues(savedPenaltiesData.values || {});
            // toast.success(`⚠️ Loaded saved Penalties data for ${selectedMda}`);
        }
    }, [savedPenaltiesData, selectedMda, scoringPeriod, isLoadingPenaltiesData, useDynamicConfig]);

    // Load saved Bonuses data (2026+)
    useEffect(() => {
        if (isLoadingBonusesData || !selectedMda || !useDynamicConfig) return;
        setBonusValues(savedBonusesData?.values || {});
    }, [savedBonusesData, selectedMda, scoringPeriod, isLoadingBonusesData, useDynamicConfig]);

    // --- Calculators ---
    const calculateMonthlySlaScore = () => {
        const months = periodMonths;
        const totalMonths = months.length;
        let monthsWithData = 0;
        let totalScore = 0;

        // Calculate points per month
        const pointsPerMonth = useDynamicConfig
            ? ((efficiencyConfig?.slaPoints ?? 30) / (efficiencyConfig?.totalMonths ?? 12))
            : 5; // 2025 default

        months.forEach(month => {
            const key = `${month.year}-${month.month}`;
            const data = monthlySlaData[key];
            if (data && (data.method === 'file' ? data.overallPercentage !== null : data.rating > 0)) {
                monthsWithData++;
                totalScore += data.score;
            }
        });

        const maxPossibleScore = useDynamicConfig
            ? (efficiencyConfig?.slaPoints ?? 30)
            : (totalMonths * pointsPerMonth); // 2025 fallback

        const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
        return { totalScore, monthsWithData, totalMonths, percentage, maxPossibleScore, pointsPerMonth };
    };

    const calculateMonthlyReportStats = () => {
        const months = periodMonths;
        const total = months.length;

        const totalPossibleScore = useDynamicConfig
            ? (efficiencyConfig?.reportSubmissionPoints ?? 3)
            : 3; // 2025 default

        let submittedCount = 0;

        if (useManualMonthlyReports) {
            submittedCount = Object.values(manualMonthlyReports).filter(Boolean).length;
        } else {
            // Logic from page.tsx: trust backend or re-implement matching?
            // Re-implement simplified matching for counter
            if (realMonthlyReports) {
                // Simple count of submitted reports that match our period months
                // Actually relying on realMonthlyReports being grouped by month is safer
                // But realMonthlyReports structure is Array<{deadline, submitted, ...}>
                // It contains all reports for the year?
                // Let's iterate months and check if a report exists
                months.forEach(month => {
                    // Find report
                    const hasSubmission = realMonthlyReports.some(r => {
                        const d = new Date(r.deadline);
                        return d.getMonth() === month.month && d.getFullYear() === month.year && r.submitted;
                    });
                    if (hasSubmission) submittedCount++;
                });
            }
        }

        // Cap calculation to available months in period
        const submitted = Math.min(submittedCount, total);
        const percentage = total > 0 ? (submitted / total) * 100 : 0;
        const score = total > 0 ? (submitted / total) * totalPossibleScore : 0;
        return { submitted, total, percentage, score };
    };

    const calculateTimelinessStats = () => {
        const months = periodMonths;
        const total = months.length;

        const totalPossibleScore = useDynamicConfig
            ? (efficiencyConfig?.timelinessPoints ?? 2)
            : 2; // 2025 default

        let onTimeCount = 0;

        if (useManualTimeliness) {
            onTimeCount = Object.values(manualTimeliness).filter(Boolean).length;
        } else {
            if (realMonthlyReports) {
                months.forEach(month => {
                    const isEarly = realMonthlyReports.some(r => {
                        const d = new Date(r.deadline);
                        return d.getMonth() === month.month && d.getFullYear() === month.year && r.onTime;
                    });
                    if (isEarly) onTimeCount++;
                });
            }
        }

        const onTime = Math.min(onTimeCount, total);
        const percentage = total > 0 ? (onTime / total) * 100 : 0;
        const score = total > 0 ? (onTime / total) * totalPossibleScore : 0;
        return { onTime, total, percentage, score };
    };

    const calculateFinalScores = () => {
        // Core metrics (Common)
        const sla = isMetricExcluded("sla") ? 0 : calculateMonthlySlaScore().totalScore;
        const mystery = isMetricExcluded("mystery") ? 0 : calculateMysteryScore(mysteryType, mysteryRatings);
        const reportGov = isMetricExcluded("reportGov") || skipReportGov ? 0 : reportgovRate;
        const monthlyReport = isMetricExcluded("reportSubmission") ? 0 : calculateMonthlyReportStats().score;
        const timeliness = isMetricExcluded("timeliness") ? 0 : calculateTimelinessStats().score;

        let controversial = 0;
        let touting = 0;
        let innovation = 0;
        let stakeholder = 0;
        let transparency = 0;
        let othersScore = 0;
        let penaltyScore = 0;
        let bonusScore = 0;

        // Keep max points aligned with dashboard model.
        let currentMaxPoints = useDynamicConfig ? 100 : 80;

        if (useDynamicConfig) {
            // 2026+ Dynamic
            // Others
            if (!isMetricExcluded("others") && othersConfig) {
                othersConfig.forEach((item: any) => {
                    if (isOthersItemExcluded(item.itemId)) return;
                    const value = othersValues[item.itemId];
                    if (item.answerType === 'yes_no') {
                        if (value) othersScore += item.weight;
                    } else {
                        const numValue = typeof value === 'number' ? value : 0;
                        othersScore += (numValue / 10) * item.weight;
                    }
                });
            }

            // Penalties ( Deductions )
            if (!isMetricExcluded("penalties") && penaltyConfig) {
                penaltyConfig.forEach((item: any) => {
                    if (penaltyValues[item.penaltyId]) {
                        // Assuming penaltyValue is positive in DB (e.g. 5), so we subtract it
                        penaltyScore -= item.penaltyValue;
                    }
                });
            }

            // Bonuses ( Extra points )
            if (!isMetricExcluded("bonuses") && bonusConfig) {
                bonusConfig.forEach((item: any) => {
                    if (bonusValues[item.bonusId]) {
                        bonusScore += Math.abs(item.bonusValue);
                    }
                });
            }

            // Adjust max points if skipped
            if (skipReportGov || isMetricExcluded("reportGov")) currentMaxPoints -= reportGovPoints;
            if (isMetricExcluded("sla")) currentMaxPoints -= (efficiencyConfig?.slaPoints ?? 30);
            if (isMetricExcluded("reportSubmission")) currentMaxPoints -= (efficiencyConfig?.reportSubmissionPoints ?? 3);
            if (isMetricExcluded("timeliness")) currentMaxPoints -= (efficiencyConfig?.timelinessPoints ?? 2);
            if (isMetricExcluded("mystery")) currentMaxPoints -= 20;
            if (isMetricExcluded("others")) {
                const othersConfiguredTotal = (othersConfig || []).reduce((sum: number, item: any) => sum + (item.weight || 0), 0);
                currentMaxPoints -= othersConfiguredTotal || 25;
            } else if (othersConfig) {
                const excludedOthersWeight = othersConfig.reduce((sum: number, item: any) => {
                    if (isOthersItemExcluded(item.itemId)) return sum + (item.weight || 0);
                    return sum;
                }, 0);
                currentMaxPoints -= excludedOthersWeight;
            }
            if (isMetricExcluded("penalties")) {
                // Penalties are deductions; excluded means no deduction logic, max points unchanged.
            }
            // Transparency is now in Others, so skipping logic depends on if "Transparency" item exists and is skippable?
            // For now, let's assume valid max points is 100 unless specific items are skipped.
            // But skipTransparency state variable is still there.
            // In 2026, transparency is just another item. If it's not applicable, maybe it's removed from config?
            // Or maybe we still support skipTransparency for specific transparency items?
            // Let's assume standard 100 max for now for 2026, minus ReportGov if skipped.

        } else {
            // 2025 Static
            controversial = isMetricExcluded("controversial") ? 0 : (isControversial ? -5 : 0);
            touting = isMetricExcluded("toutingRentseeking") ? 0 : (isTouting ? -5 : 0);
            innovation = isMetricExcluded("innovation") ? 0 : (isInnovation ? 5 : 0);
            stakeholder = isMetricExcluded("stakeholder") ? 0 : stakeholderRate;
            transparency = (isMetricExcluded("transparency") || skipTransparency) ? 0 : (transparencyItems.serviceLevelPublishing ? 5 : 0);

            if (skipReportGov || isMetricExcluded("reportGov")) currentMaxPoints -= reportGovPoints;
            if (skipTransparency || isMetricExcluded("transparency")) currentMaxPoints -= 5;
            if (isMetricExcluded("mystery")) currentMaxPoints -= 20;
            if (isMetricExcluded("sla")) currentMaxPoints -= 30;
            if (isMetricExcluded("reportSubmission")) currentMaxPoints -= 3;
            if (isMetricExcluded("timeliness")) currentMaxPoints -= 2;
            if (isMetricExcluded("innovation")) currentMaxPoints -= 5;
        }

        // Total
        let totalScore = 0;
        if (useDynamicConfig) {
            totalScore = sla + mystery + reportGov + monthlyReport + timeliness + othersScore + penaltyScore + bonusScore;
        } else {
            totalScore = sla + mystery + innovation + stakeholder + transparency + reportGov + monthlyReport + timeliness + controversial + touting;
        }

        totalScore = Math.max(0, totalScore);

        return {
            totalPercentage: currentMaxPoints > 0 ? (totalScore / currentMaxPoints) * 100 : 0,
            totalScore,
            maxPossiblePoints: currentMaxPoints,
            scores: {
                serviceLevelAgreement: sla,
                mysteryShopping: mystery,
                controversial: useDynamicConfig ? 0 : controversial,
                toutingRentseeking: useDynamicConfig ? 0 : touting,
                innovation: useDynamicConfig ? 0 : innovation,
                stakeholderEngagement: useDynamicConfig ? 0 : stakeholder,
                transparency: useDynamicConfig ? 0 : transparency,
                reportGovernanceResolution: reportGov,
                monthlyReportSubmission: monthlyReport,
                timelinessInSubmitting: timeliness,
                others: othersScore,
                penalties: penaltyScore,
                bonuses: bonusScore
            }
        };
    };

    // --- Handlers ---
    const handleSaveSLAData = async () => {
        if (!selectedMda) return;
        try {
            const stats = calculateMonthlySlaScore();
            await saveSLAData({
                mdaName: selectedMda,
                scoringPeriod,
                monthlySlaData: monthlySlaData,
                totalScore: stats.totalScore,
                monthsWithData: stats.monthsWithData,
                totalMonths: stats.totalMonths,
                percentage: stats.percentage
            });
            toast.success("SLA Data saved successfully");
        } catch (error) {
            toast.error("Failed to save SLA Data");
        }
    };

    const handleSaveMystery = async () => {
        if (!selectedMda) return;
        const maxPossibleScore = useDynamicConfig && Array.isArray(mysteryConfig)
            ? mysteryConfig.find((t: any) => (t.typeId || t.typeName) === mysteryType)?.questions?.reduce((sum: number, q: any) => sum + (q.weight || 0), 0) || 20
            : 20;

        const score = calculateMysteryScore(
            mysteryType,
            mysteryRatings,
            useDynamicConfig ? mysteryConfig : undefined,
            maxPossibleScore
        );

        try {
            await saveMysteryData({
                mdaName: selectedMda,
                scoringPeriod,
                score,
                ratings: mysteryRatings,
                type: mysteryType,
                maxPossibleScore,
                percentage: maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0
            });
            toast.success("Mystery Shopping Data saved");
        } catch (error) {
            toast.error("Failed to save Mystery Shopping Data");
        }
    };

    // Generic handlers for simple metrics
    const handleSaveControversial = async () => {
        if (!selectedMda) return;
        try {
            await saveControversialData({
                mdaName: selectedMda,
                scoringPeriod,
                isControversial,
                score: isControversial ? -5 : 0
            });
            toast.success("Controversial status saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveTouting = async () => {
        if (!selectedMda) return;
        try {
            await saveToutingData({
                mdaName: selectedMda,
                scoringPeriod,
                isTouting: isTouting,
                score: isTouting ? -5 : 0
            });
            toast.success("Touting status saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveInnovation = async () => {
        if (!selectedMda) return;
        try {
            await saveInnovationData({
                mdaName: selectedMda,
                scoringPeriod,
                isInnovative: isInnovation,
                score: isInnovation ? 5 : 0
            });
            toast.success("Innovation status saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveStakeholder = async () => {
        if (!selectedMda) return;
        try {
            await saveStakeholderData({
                mdaName: selectedMda,
                scoringPeriod,
                rate: stakeholderRate,
                score: stakeholderRate
            });
            toast.success("Stakeholder score saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveOthers = async () => {
        if (!selectedMda || !othersConfig) return;
        try {
            // Calculate scores
            const scores: Record<string, number> = {};
            let totalScore = 0;

            othersConfig.forEach((item: any) => {
                const value = othersValues[item.itemId];
                let itemScore = 0;
                if (item.answerType === 'yes_no') {
                    itemScore = value ? item.weight : 0;
                } else { // scale_1_10
                    const numValue = typeof value === 'number' ? value : 0;
                    itemScore = (numValue / 10) * item.weight;
                }
                scores[item.itemId] = itemScore;
                totalScore += itemScore;
            });

            await saveOthersItems({
                mdaName: selectedMda,
                scoringPeriod,
                values: othersValues,
                scores,
                totalScore
            });
            toast.success("Result saved");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        }
    };

    const handleSavePenalties = async () => {
        if (!selectedMda || !penaltyConfig) return;
        try {
            let totalPenalty = 0;
            penaltyConfig.forEach((item: any) => {
                if (penaltyValues[item.penaltyId]) {
                    totalPenalty += item.penaltyValue;
                }
            });

            await savePenaltiesItems({
                mdaName: selectedMda,
                scoringPeriod,
                values: penaltyValues,
                totalPenalty
            });
            toast.success("Result saved");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        }
    };

    const handleSaveBonuses = async () => {
        if (!selectedMda || !bonusConfig) return;
        try {
            let totalBonus = 0;
            bonusConfig.forEach((item: any) => {
                if (bonusValues[item.bonusId]) {
                    totalBonus += Math.abs(item.bonusValue);
                }
            });

            await saveBonusesItems({
                mdaName: selectedMda,
                scoringPeriod,
                values: bonusValues,
                totalBonus
            });
            toast.success("Result saved");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        }
    };

    const handleSaveTransparency = async () => {
        if (!selectedMda) return;
        try {
            const score = skipTransparency ? 0 : (transparencyItems.serviceLevelPublishing ? 10 : 0);
            await saveTransparencyData({
                mdaName: selectedMda,
                scoringPeriod,
                responses: transparencyItems,
                score,
                isSkipped: skipTransparency
            });
            toast.success("Transparency data saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveReportGov = async () => {
        if (!selectedMda) return;
        try {
            const ticketData = {
                totalTickets: ticketResolutionData?.totalTickets || 0,
                resolvedTickets: ticketResolutionData?.resolvedTickets || 0,
                averageResponseTime: ticketResolutionData?.averageResponseTime || 0,
                averageResolutionTime: ticketResolutionData?.averageResolutionTime || 0,
                resolutionRate: ticketResolutionData?.resolutionRate || 0,
                score: (ticketResolutionData as any)?.score || reportgovRate
            };

            await saveReportGovData({
                mdaName: selectedMda,
                scoringPeriod,
                isManual: false,
                isSkipped: skipReportGov,
                ...ticketData
            });
            toast.success("ReportGov data saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveMonthlyReport = async () => {
        if (!selectedMda) return;
        try {
            const stats = calculateMonthlyReportStats();
            await saveMonthlyReportData({
                mdaName: selectedMda,
                scoringPeriod,
                useManual: useManualMonthlyReports,
                manualMonthlyReports: manualMonthlyReports,
                score: stats.score
            });
            toast.success("Monthly Report data saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveTimeliness = async () => {
        if (!selectedMda) return;
        try {
            const stats = calculateTimelinessStats();
            await saveTimelinessData({
                mdaName: selectedMda,
                scoringPeriod,
                useManual: useManualTimeliness,
                manualTimeliness: manualTimeliness,
                score: stats.score
            });
            toast.success("Timeliness data saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const handleSaveFinalScore = async () => {
        if (!selectedMda) return;
        try {
            const finalScores = calculateFinalScores();
            const performanceData = {
                totalTickets: ticketResolutionData?.totalTickets || 0,
                resolvedTickets: ticketResolutionData?.resolvedTickets || 0,
                averageResponseTime: ticketResolutionData?.averageResponseTime || 0,
                averageResolutionTime: ticketResolutionData?.averageResolutionTime || 0,
                resolutionRate: ticketResolutionData?.resolutionRate || 0
            };

            // Trigger backend calculation and save
            await calculateScore({
                mdaName: selectedMda,
                scoringPeriod,
                notes,
                recommendations,
                // Scores
                serviceLevelAgreementScore: finalScores.scores.serviceLevelAgreement,
                mysteryShoppingScore: finalScores.scores.mysteryShopping,
                controversialScore: finalScores.scores.controversial,
                innovationScore: finalScores.scores.innovation,
                stakeholderEngagementScore: finalScores.scores.stakeholderEngagement,
                transparencyScore: finalScores.scores.transparency,
                reportGovernanceResolutionScore: finalScores.scores.reportGovernanceResolution,
                monthlyReportSubmissionScore: finalScores.scores.monthlyReportSubmission,
                timelinessInSubmittingScore: finalScores.scores.timelinessInSubmitting,
                othersScore: finalScores.scores.others,
                penaltiesScore: finalScores.scores.penalties,
                bonusesScore: finalScores.scores.bonuses,

                // Performance Data
                ...performanceData,

                // Website Indicators (Defaults as they are not currently tracked in this tab)
                hasActiveWebsite: true,
                hasReportGovLink: true,
                hasActiveUsers: true,

                maxPossiblePoints: finalScores.maxPossiblePoints,
                scoringMethod: skipReportGov ? "skip_reportgov" : "standard"
            });
            toast.success("Final Score Calculated and Saved!");
            setShowFinalScore(false);
        } catch (e) { toast.error("Failed to calculate final score"); }
    };

    return (
        <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full flex flex-col gap-5">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <MDASelector
                        selectedMda={selectedMda}
                        setSelectedMda={setSelectedMda}
                        mdasList={mdasList}
                        mdasWithScores={mdasWithScores}
                        allMdaScoringStatuses={allMdaScoringStatuses || {}}
                        sanitizeMdaName={sanitizeMdaName}
                    />

                    <MDAStatusDisplay
                        selectedMda={selectedMda}
                        mdasList={mdasList}
                        mdasWithScores={mdasWithScores}
                        mdaScoringStatus={mdaScoringStatus}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!useDynamicConfig && (
                            <ScoringPeriodInfo
                                scoringPeriod={scoringPeriod}
                                currentYear={currentYear}
                            />
                        )}
                        <PastPerformanceInfo
                            pastScoringData={pastScoringData || null}
                        />
                    </div>
                </div>

                {/* --- Efficiency Section --- */}
                <div className="w-full space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Efficiency & Compliance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <SLAMetricCard
                            isLoadingSLAData={!!selectedMda && savedSLAData === undefined}
                            savedSLAData={!!savedSLAData}
                            setShowSLARanking={setShowSLARanking}
                            scoringPeriod={scoringPeriod}
                            currentYear={currentYear}
                            monthlySlaData={monthlySlaData}
                            slaScore={calculateMonthlySlaScore()}
                            setShowSlaModal={setShowSlaModal}
                            handleSaveSLAData={handleSaveSLAData}
                            selectedMda={selectedMda}
                            periodMonths={periodMonths}
                            useDynamicConfig={useDynamicConfig}
                            efficiencyConfig={efficiencyConfig}
                        />
                        <MonthlyReportCard
                            isLoading={isLoadingMonthlyReportData}
                            isSaved={!!savedMonthlyReportData}
                            monthlyReportData={calculateMonthlyReportStats()}
                            scoringPeriod={scoringPeriod}
                            realMonthlyReports={realMonthlyReports || []}
                            handleSave={handleSaveMonthlyReport}
                            selectedMda={selectedMda}
                            periodMonths={periodMonths}
                            maxPoints={useDynamicConfig && efficiencyConfig ? efficiencyConfig.reportSubmissionPoints : 3}
                        />
                        <TimelinessCard
                            isLoading={isLoadingTimelinessData}
                            isSaved={!!savedTimelinessData}
                            timelinessData={calculateTimelinessStats()}
                            scoringPeriod={scoringPeriod}
                            realMonthlyReports={realMonthlyReports || []}
                            handleSave={handleSaveTimeliness}
                            selectedMda={selectedMda}
                            periodMonths={periodMonths}
                            maxPoints={useDynamicConfig && efficiencyConfig ? efficiencyConfig.timelinessPoints : 2}
                        />
                    </div>
                </div>

                {/* --- Mystery Shopping & ReportGov Section --- */}
                <div className="w-full space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Mystery Shopping & ReportGov</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MysteryShoppingCard
                            isLoading={isLoadingMysteryShoppingData}
                            isSaved={!!savedMysteryShoppingData}
                            setShowRanking={setShowMysteryRanking}
                            setShowModal={setShowMysteryModal}
                            score={calculateMysteryScore(
                                mysteryType,
                                mysteryRatings,
                                useDynamicConfig ? mysteryConfig : undefined,
                                useDynamicConfig && Array.isArray(mysteryConfig)
                                    ? mysteryConfig.find((t: any) => (t.typeId || t.typeName) === mysteryType)?.questions?.reduce((sum: number, q: any) => sum + (q.weight || 0), 0) || 20
                                    : 20
                            )}
                            handleSave={handleSaveMystery}
                            selectedMda={selectedMda}
                            hasRatings={Object.keys(mysteryRatings).length > 0}
                            maxPoints={useDynamicConfig && Array.isArray(mysteryConfig)
                                ? mysteryConfig.find((t: any) => (t.typeId || t.typeName) === mysteryType)?.questions?.reduce((sum: number, q: any) => sum + (q.weight || 0), 0) || 20
                                : 20
                            }
                        />
                        <ReportGovCard
                            isLoading={!!selectedMda && (ticketResolutionData === undefined || isLoadingReportGovData)}
                            isSaved={!!savedReportGovData}
                            setShowRanking={setShowReportGovRanking}
                            skip={skipReportGov}
                            setSkip={setSkipReportGov}
                            scoringPeriod={scoringPeriod}
                            currentYear={currentYear}
                            ticketResolutionData={ticketResolutionData || { totalTickets: 0, resolvedTickets: 0, resolutionRate: 0, averageResponseTime: 0, averageResolutionTime: 0, score: 0 }}
                            reportgovRate={reportgovRate}
                            setReportgovRate={setReportgovRate}
                            handleSave={handleSaveReportGov}
                            selectedMda={selectedMda}
                            mdasList={mdasList}
                            mdasWithScores={mdasWithScores || []}
                            periodTicketData={ticketResolutionData || null}
                            maxPoints={reportGovPoints}
                        />
                    </div>
                </div>

                {/* --- Others & Penalties Section --- */}
                <div className="w-full space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Other Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {useDynamicConfig ? (
                            <>
                                {othersConfig && (
                                    <DynamicOthersCard
                                        othersConfig={othersConfig}
                                        othersValues={othersValues}
                                        onValueChange={(id, val) => setOthersValues(prev => ({ ...prev, [id]: val }))}
                                        onSave={handleSaveOthers}
                                        isLoading={isLoadingOthersData}
                                        isSaved={!!savedOthersData}
                                        selectedMda={selectedMda}
                                    />
                                )}
                                {penaltyConfig && (
                                    <DynamicPenaltiesCard
                                        penaltyConfig={penaltyConfig}
                                        penaltyValues={penaltyValues}
                                        onValueChange={(id, val) => setPenaltyValues(prev => ({ ...prev, [id]: val }))}
                                        onSave={handleSavePenalties}
                                        isLoading={isLoadingPenaltiesData}
                                        isSaved={!!savedPenaltiesData}
                                        selectedMda={selectedMda}
                                    />
                                )}
                                {bonusConfig && bonusConfig.length > 0 && (
                                    <DynamicBonusesCard
                                        bonusConfig={bonusConfig}
                                        bonusValues={bonusValues}
                                        onValueChange={(id, val) => setBonusValues(prev => ({ ...prev, [id]: val }))}
                                        onSave={handleSaveBonuses}
                                        isLoading={isLoadingBonusesData}
                                        isSaved={!!savedBonusesData}
                                        selectedMda={selectedMda}
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <BooleanMetricCard
                                    title="Controversial"
                                    isLoading={isLoadingControversialData}
                                    isSaved={!!savedControversialData}
                                    points={-5}
                                    pointsLabel="Penalty: -5"
                                    value={isControversial}
                                    setValue={setIsControversial}
                                    handleSave={handleSaveControversial}
                                    selectedMda={selectedMda}
                                />

                                <BooleanMetricCard
                                    title="Touting & Rentseeking"
                                    isLoading={isLoadingToutingRentseekingData}
                                    isSaved={!!savedToutingRentseekingData}
                                    points={-5}
                                    pointsLabel="Penalty: -5"
                                    value={isTouting}
                                    setValue={setIsTouting}
                                    handleSave={handleSaveTouting}
                                    selectedMda={selectedMda}
                                />

                                <BooleanMetricCard
                                    title="Innovation"
                                    isLoading={isLoadingInnovationData}
                                    isSaved={!!savedInnovationData}
                                    points={5}
                                    pointsLabel="5 Points"
                                    value={isInnovation}
                                    setValue={setIsInnovation}
                                    handleSave={handleSaveInnovation}
                                    selectedMda={selectedMda}
                                />

                                <StakeholderCard
                                    isLoading={isLoadingStakeholderData}
                                    isSaved={!!savedStakeholderData}
                                    rate={stakeholderRate}
                                    setRate={setStakeholderRate}
                                    handleSave={handleSaveStakeholder}
                                    selectedMda={selectedMda}
                                />

                                <TransparencyCard
                                    isLoading={isLoadingTransparencyData}
                                    isSaved={!!savedTransparencyData}
                                    skipTransparency={skipTransparency}
                                    setSkipTransparency={setSkipTransparency}
                                    transparencyItems={transparencyItems}
                                    setTransparencyItems={setTransparencyItems}
                                    transparencyQuestions={transparencyQuestions}
                                    transparencyScore={skipTransparency ? 0 : (transparencyItems.serviceLevelPublishing ? 10 : 0)}
                                    handleSave={handleSaveTransparency}
                                    selectedMda={selectedMda}
                                />
                            </>
                        )}
                    </div>
                </div>

                <FinalScoreButton
                    handleCalculateScore={() => setShowFinalScore(true)}
                    selectedMda={selectedMda}
                    hasScore={mdaScoringStatus?.hasScore}
                />
            </div>

            {/* Modals */}
            <MysteryShoppingModal
                showModal={showMysteryModal}
                onClose={() => setShowMysteryModal(false)}
                mysteryRatings={mysteryRatings}
                onRatingChange={(key, value) => setMysteryRatings(prev => ({ ...prev, [key]: value }))}
                mysteryType={mysteryType}
                onTypeChange={setMysteryType}
                calculateScore={() => calculateMysteryScore(
                    mysteryType,
                    mysteryRatings,
                    useDynamicConfig ? mysteryConfig : undefined,
                    useDynamicConfig && Array.isArray(mysteryConfig)
                        ? mysteryConfig.find((t: any) => (t.typeId || t.typeName) === mysteryType)?.questions?.reduce((sum: number, q: any) => sum + (q.weight || 0), 0) || 20
                        : 20
                )}
                onSave={handleSaveMystery}
                useDynamicConfig={useDynamicConfig}
                mysteryConfig={mysteryConfig}
                maxPoints={useDynamicConfig && Array.isArray(mysteryConfig)
                    ? mysteryConfig.find((t: any) => (t.typeId || t.typeName) === mysteryType)?.questions?.reduce((sum: number, q: any) => sum + (q.weight || 0), 0) || 20
                    : 20
                }
            />

            <MonthlySLAModal
                show={showSlaModal}
                onHide={() => setShowSlaModal(false)}
                scoringPeriod={scoringPeriod}
                monthlySlaData={monthlySlaData}
                setMonthlySlaData={setMonthlySlaData}
                currentYear={scoringYear}
                periodMonths={periodMonths}
                pointsPerMonth={useDynamicConfig ? ((efficiencyConfig?.slaPoints ?? 30) / (efficiencyConfig?.totalMonths ?? 12)) : 5}
                maxPoints={useDynamicConfig ? (efficiencyConfig?.slaPoints ?? 30) : 30}
                mdaName={selectedMda}
            />

            <FinalScoreModal
                show={showFinalScore}
                onHide={() => setShowFinalScore(false)}
                selectedMda={selectedMda}
                scoringPeriod={scoringPeriod}
                finalScoreData={calculateFinalScores()}
                pastScoringData={pastScoringData || null}
                skipReportGov={skipReportGov}
                skipTransparency={skipTransparency}
                notes={notes}
                setNotes={setNotes}
                recommendations={recommendations}
                setRecommendations={setRecommendations}
                handleSaveScore={handleSaveFinalScore}
            />

            {/* Ranking Modals */}
            <MysteryShoppingRankingModal
                showModal={showMysteryRanking}
                onClose={() => setShowMysteryRanking(false)}
                mysteryRankings={mysteryRankings}
                scoringPeriod={scoringPeriod}
                currentYear={currentYear}
            />

            <SLARankingModal
                showModal={showSLARanking}
                onClose={() => setShowSLARanking(false)}
                slaRankings={slaRankings}
                scoringPeriod={scoringPeriod}
                currentYear={currentYear}
            />

            <ReportGovRankingModal
                showModal={showReportGovRanking}
                onClose={() => setShowReportGovRanking(false)}
                reportGovRankings={reportGovRankings}
                scoringPeriod={scoringPeriod}
                currentYear={currentYear}
            />
        </div>
    );
}
