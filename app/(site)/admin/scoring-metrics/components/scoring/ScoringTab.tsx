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
    const [mysteryType, setMysteryType] = useState<MysteryShoppingType>('hasReportGov');

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
    const [manualReportGovRate, setManualReportGovRate] = useState(0);
    const [useManualReportGov, setUseManualReportGov] = useState(false);
    const [skipReportGov, setSkipReportGov] = useState(false);
    const [manualTotalTickets, setManualTotalTickets] = useState(0);
    const [manualResolvedTickets, setManualResolvedTickets] = useState(0);
    const [manualAverageResponseTime, setManualAverageResponseTime] = useState(0);
    const [manualAverageResolutionTime, setManualAverageResolutionTime] = useState(0);

    // Monthly Report State
    const [manualMonthlyReports, setManualMonthlyReports] = useState<Record<string, boolean>>({});
    const [useManualMonthlyReports, setUseManualMonthlyReports] = useState(false);

    // Timeliness State
    const [manualTimeliness, setManualTimeliness] = useState<Record<string, boolean>>({});
    const [useManualTimeliness, setUseManualTimeliness] = useState(false);

    // Modal Visibility
    const [showSlaModal, setShowSlaModal] = useState(false);
    const [showMysteryModal, setShowMysteryModal] = useState(false);
    const [showFinalScore, setShowFinalScore] = useState(false);

    // Ranking Modals
    const [showMysteryRanking, setShowMysteryRanking] = useState(false);
    const [showSLARanking, setShowSLARanking] = useState(false);
    const [showReportGovRanking, setShowReportGovRanking] = useState(false);

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
            setManualReportGovRate(0);
            setUseManualReportGov(false);
            setSkipReportGov(false);
            setManualTotalTickets(0);
            setManualResolvedTickets(0);
            setManualAverageResponseTime(0);
            setManualAverageResolutionTime(0);
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
            let score = 0;
            const { resolutionRate, averageResponseTime, averageResolutionTime, totalTickets } = ticketResolutionData;

            if (totalTickets > 0) {
                if (resolutionRate >= 100) score += 7;
                else if (resolutionRate >= 95) score += 6;
                else if (resolutionRate >= 90) score += 5;
                else if (resolutionRate >= 85) score += 4;
                else if (resolutionRate >= 80) score += 3;
                else if (resolutionRate >= 75) score += 2;
                else if (resolutionRate >= 70) score += 1;

                if (averageResponseTime <= 24) score += 3;
                else if (averageResponseTime <= 48) score += 2;
                else if (averageResponseTime <= 72) score += 1;

                if (averageResolutionTime <= 48) score += 5;
                else if (averageResolutionTime <= 72) score += 4;
                else if (averageResolutionTime <= 96) score += 3;
                else if (averageResolutionTime <= 120) score += 2;
                else if (averageResolutionTime <= 144) score += 1;
            }

            setReportgovRate(Math.min(score, 15));
        }
    }, [ticketResolutionData]);

    // Load saved Report Gov data when available
    useEffect(() => {
        if (!isLoadingReportGovData && savedReportGovData && selectedMda) {
            if (savedReportGovData.isSkipped) {
                setSkipReportGov(true);
                setUseManualReportGov(false);
            } else if (savedReportGovData.isManual) {
                setUseManualReportGov(true);
                setSkipReportGov(false);
                setManualTotalTickets(savedReportGovData.totalTickets);
                setManualResolvedTickets(savedReportGovData.resolvedTickets);
                setManualAverageResponseTime(savedReportGovData.averageResponseTime);
                setManualAverageResolutionTime(savedReportGovData.averageResolutionTime);
                setManualReportGovRate(savedReportGovData.score);
            } else {
                setUseManualReportGov(false);
                setSkipReportGov(false);
                setReportgovRate(savedReportGovData.score);
            }
            toast.success(`📊 Loaded saved Report Gov data for ${selectedMda}`);
        }
    }, [savedReportGovData, selectedMda, scoringPeriod, isLoadingReportGovData]);

    // Load saved Mystery Shopping data
    useEffect(() => {
        if (!isLoadingMysteryShoppingData && savedMysteryShoppingData && selectedMda) {
            const data = savedMysteryShoppingData as any;
            setMysteryType((data.mysteryType || data.type) as MysteryShoppingType);
            setMysteryRatings(data.ratings || {});
            toast.success(`🛍️ Loaded saved Mystery Shopping data for ${selectedMda}`);
        }
    }, [savedMysteryShoppingData, selectedMda, scoringPeriod, isLoadingMysteryShoppingData]);

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

    // --- Calculators ---
    const calculateMonthlySlaScore = () => {
        const months = getMonthsForPeriod(scoringPeriod);
        const totalMonths = months.length;
        let monthsWithData = 0;
        let totalScore = 0;

        months.forEach(month => {
            const key = `${month.year}-${month.month}`;
            const data = monthlySlaData[key];
            if (data && (data.method === 'file' ? data.overallPercentage !== null : data.rating > 0)) {
                monthsWithData++;
                totalScore += data.score;
            }
        });

        const percentage = totalMonths > 0 ? (totalScore / (totalMonths * 5)) * 100 : 0;
        return { totalScore, monthsWithData, totalMonths, percentage };
    };

    const calculateManualReportGovScore = () => {
        if (!manualTotalTickets) return 0;
        const resolutionRate = manualTotalTickets > 0 ? (manualResolvedTickets / manualTotalTickets) * 100 : 0;
        let score = 0;
        if (resolutionRate >= 100) score += 7;
        else if (resolutionRate >= 95) score += 6;
        else if (resolutionRate >= 90) score += 5;
        else if (resolutionRate >= 85) score += 4;
        else if (resolutionRate >= 80) score += 3;
        else if (resolutionRate >= 75) score += 2;
        else if (resolutionRate >= 70) score += 1;

        if (manualAverageResponseTime <= 24) score += 3;
        else if (manualAverageResponseTime <= 48) score += 2;
        else if (manualAverageResponseTime <= 72) score += 1;

        if (manualAverageResolutionTime <= 48) score += 5;
        else if (manualAverageResolutionTime <= 72) score += 4;
        else if (manualAverageResolutionTime <= 96) score += 3;
        else if (manualAverageResolutionTime <= 120) score += 2;
        else if (manualAverageResolutionTime <= 144) score += 1;

        return Math.min(score, 15);
    };

    const calculateMonthlyReportStats = () => {
        const months = getMonthsForPeriod(scoringPeriod);
        const total = months.length;
        const totalPossibleScore = 3;

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
        const months = getMonthsForPeriod(scoringPeriod);
        const total = months.length;
        const totalPossibleScore = 2;
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
        const sla = calculateMonthlySlaScore().totalScore;
        const mystery = calculateMysteryScore(mysteryType, mysteryRatings);
        const controversial = isControversial ? -5 : 0; // New format logic per user snippet
        const touting = isTouting ? -5 : 0;
        const innovation = isInnovation ? 5 : 0;
        const stakeholder = stakeholderRate;
        const transparency = skipTransparency ? 0 : (transparencyItems.serviceLevelPublishing ? 10 : 0);
        const reportGov = skipReportGov ? 0 : (useManualReportGov ? manualReportGovRate : reportgovRate);
        const monthlyReport = calculateMonthlyReportStats().score;
        const timeliness = calculateTimelinessStats().score;

        let currentMaxPoints = 100;
        if (skipReportGov) currentMaxPoints -= 15;
        if (skipTransparency) currentMaxPoints -= 10;

        let totalScore = sla + mystery + innovation + stakeholder + transparency + reportGov + monthlyReport + timeliness + controversial + touting;
        totalScore = Math.max(0, totalScore); // No negative total?

        // Apply averaging logic if needed (handled in backend usually, but for display:)
        let baseTotalScore = totalScore;
        let finalDisplayScore = totalScore;

        if (pastScoringData && pastScoringData.lastScored) {
            // Mock averaging logic for display
            // Real calculation happens in backend 'calculateScore' mutation
            // But we need to show preview
            // logic: 70% current + 30% past
            // pastScores is string, need parsing? No, 'pastScores' is just descriptive string
            // Wait, pastScoringData has actual scores?
            // Typically backend handles this.
            // We'll trust the backend return or just show "Pending Calculation"
        }

        return {
            totalPercentage: (totalScore / currentMaxPoints) * 100,
            totalScore,
            maxPossiblePoints: currentMaxPoints,
            scores: {
                serviceLevelAgreement: sla,
                mysteryShopping: mystery,
                controversial,
                toutingRentseeking: touting,
                innovation,
                stakeholderEngagement: stakeholder,
                transparency,
                reportGovernanceResolution: reportGov,
                monthlyReportSubmission: monthlyReport,
                timelinessInSubmitting: timeliness
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
        const score = calculateMysteryScore(mysteryType, mysteryRatings);
        try {
            await saveMysteryData({
                mdaName: selectedMda,
                scoringPeriod,
                score,
                ratings: mysteryRatings,
                type: mysteryType
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
            const ticketData = useManualReportGov ? {
                totalTickets: manualTotalTickets,
                resolvedTickets: manualResolvedTickets,
                averageResponseTime: manualAverageResponseTime,
                averageResolutionTime: manualAverageResolutionTime,
                resolutionRate: manualTotalTickets > 0 ? (manualResolvedTickets / manualTotalTickets) * 100 : 0,
                score: manualReportGovRate
            } : {
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
                isManual: useManualReportGov,
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
            const performanceData = useManualReportGov
                ? {
                    totalTickets: manualTotalTickets,
                    resolvedTickets: manualResolvedTickets,
                    averageResponseTime: manualAverageResponseTime,
                    averageResolutionTime: manualAverageResolutionTime,
                    resolutionRate: manualTotalTickets > 0 ? (manualResolvedTickets / manualTotalTickets) * 100 : 0
                }
                : {
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
                        <ScoringPeriodInfo
                            scoringPeriod={scoringPeriod}
                            currentYear={currentYear}
                        />
                        <PastPerformanceInfo
                            pastScoringData={pastScoringData || null}
                        />
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    />

                    <MysteryShoppingCard
                        isLoading={isLoadingMysteryShoppingData}
                        isSaved={!!savedMysteryShoppingData}
                        setShowRanking={setShowMysteryRanking}
                        setShowModal={setShowMysteryModal}
                        score={calculateMysteryScore(mysteryType, mysteryRatings)}
                        handleSave={handleSaveMystery}
                        selectedMda={selectedMda}
                        hasRatings={Object.keys(mysteryRatings).length > 0}
                    />

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

                    <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ReportGovCard
                            isLoading={!!selectedMda && (ticketResolutionData === undefined || isLoadingReportGovData)}
                            isSaved={!!savedReportGovData}
                            setShowRanking={setShowReportGovRanking}
                            useManual={useManualReportGov}
                            setUseManual={setUseManualReportGov}
                            skip={skipReportGov}
                            setSkip={setSkipReportGov}
                            scoringPeriod={scoringPeriod}
                            currentYear={currentYear}
                            ticketResolutionData={ticketResolutionData || { totalTickets: 0, resolvedTickets: 0, resolutionRate: 0, averageResponseTime: 0, averageResolutionTime: 0, score: 0 }}
                            reportgovRate={reportgovRate}
                            setReportgovRate={setReportgovRate}
                            manualTotalTickets={manualTotalTickets}
                            setManualTotalTickets={setManualTotalTickets}
                            manualResolvedTickets={manualResolvedTickets}
                            setManualResolvedTickets={setManualResolvedTickets}
                            manualAverageResponseTime={manualAverageResponseTime}
                            setManualAverageResponseTime={setManualAverageResponseTime}
                            manualAverageResolutionTime={manualAverageResolutionTime}
                            setManualAverageResolutionTime={setManualAverageResolutionTime}
                            calculateManualRate={calculateManualReportGovScore}
                            manualRate={manualReportGovRate}
                            setManualRate={setManualReportGovRate}
                            handleSave={handleSaveReportGov}
                            selectedMda={selectedMda}
                            mdasList={mdasList}
                            mdasWithScores={mdasWithScores || []}
                            periodTicketData={ticketResolutionData || null}
                        />
                    </div>

                    <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col md:flex-row gap-6">
                        <MonthlyReportCard
                            isLoading={isLoadingMonthlyReportData}
                            isSaved={!!savedMonthlyReportData}
                            useManual={useManualMonthlyReports}
                            setUseManual={setUseManualMonthlyReports}
                            monthlyReportData={calculateMonthlyReportStats()}
                            scoringPeriod={scoringPeriod}
                            manualMonthlyReports={manualMonthlyReports}
                            setManualMonthlyReports={setManualMonthlyReports}
                            realMonthlyReports={realMonthlyReports || []}
                            handleSave={handleSaveMonthlyReport}
                            selectedMda={selectedMda}
                        />
                        <TimelinessCard
                            isLoading={isLoadingTimelinessData}
                            isSaved={!!savedTimelinessData}
                            useManual={useManualTimeliness}
                            setUseManual={setUseManualTimeliness}
                            timelinessData={calculateTimelinessStats()}
                            scoringPeriod={scoringPeriod}
                            manualTimeliness={manualTimeliness}
                            setManualTimeliness={setManualTimeliness}
                            realMonthlyReports={realMonthlyReports || []}
                            handleSave={handleSaveTimeliness}
                            selectedMda={selectedMda}
                        />
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
                calculateScore={() => calculateMysteryScore(mysteryType, mysteryRatings)}
                onSave={handleSaveMystery}
            />

            <MonthlySLAModal
                show={showSlaModal}
                onHide={() => setShowSlaModal(false)}
                scoringPeriod={scoringPeriod}
                monthlySlaData={monthlySlaData}
                setMonthlySlaData={setMonthlySlaData}
                currentYear={currentYear}
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
