'use client';

import React from 'react';

interface FinalScoreData {
    totalPercentage: number;
    totalScore: number;
    maxPossiblePoints: number;
    baseScores?: Record<string, number>;
    scores: {
        serviceLevelAgreement: number;
        mysteryShopping: number;
        controversial: number;
        toutingRentseeking: number;
        innovation: number;
        stakeholderEngagement: number;
        transparency: number;
        reportGovernanceResolution: number;
        monthlyReportSubmission: number;
        timelinessInSubmitting: number;
    };
}

interface FinalScoreModalProps {
    show: boolean;
    onHide: () => void;
    selectedMda: string;
    scoringPeriod: string;
    finalScoreData: FinalScoreData;
    pastScoringData: { pastScores: string | number | null; lastScored: number | null } | null;
    skipReportGov: boolean;
    skipTransparency: boolean;
    notes: string;
    setNotes: (val: string) => void;
    recommendations: string;
    setRecommendations: (val: string) => void;
    handleSaveScore: () => void;
}

export default function FinalScoreModal({
    show,
    onHide,
    selectedMda,
    scoringPeriod,
    finalScoreData,
    pastScoringData,
    skipReportGov,
    skipTransparency,
    notes,
    setNotes,
    recommendations,
    setRecommendations,
    handleSaveScore
}: FinalScoreModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
                <button
                    onClick={onHide}
                    className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                >
                    &times;
                </button>

                <div className="p-6">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">MDA Scoring Results</h1>
                        <p className="text-gray-600">{selectedMda} - {scoringPeriod}</p>
                    </div>

                    {/* Score Display */}
                    <div className="flex justify-center mb-8">
                        <div className="w-48 h-48 bg-blue-100 rounded-full flex items-center justify-center border-8 border-blue-200">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-blue-800">
                                    {finalScoreData.totalPercentage.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Score Breakdown</h3>
                            <div className="space-y-2 text-sm">
                                <div>Service Level Agreement: {finalScoreData.scores.serviceLevelAgreement.toFixed(1)}/30</div>
                                <div>Mystery Shopping: {finalScoreData.scores.mysteryShopping.toFixed(1)}/20</div>
                                <div>Controversial: {finalScoreData.scores.controversial.toFixed(1)} points</div>
                                <div>Touting & Rentseeking: {finalScoreData.scores.toutingRentseeking.toFixed(1)} points</div>
                                <div>Innovation: {finalScoreData.scores.innovation.toFixed(1)}/5</div>
                                <div>Stakeholder Engagement: {finalScoreData.scores.stakeholderEngagement.toFixed(1)}/10</div>
                                <div>Transparency: {finalScoreData.scores.transparency.toFixed(1)}/10</div>
                                <div className={skipReportGov ? "text-gray-500 line-through" : ""}>
                                    Report Gov Resolution: {finalScoreData.scores.reportGovernanceResolution.toFixed(1)}/15
                                    {skipReportGov && " (Skipped)"}
                                </div>
                                <div>Monthly Report Submission: {finalScoreData.scores.monthlyReportSubmission.toFixed(1)}/3</div>
                                <div>Timeliness in Submitting: {finalScoreData.scores.timelinessInSubmitting.toFixed(1)}/2</div>
                            </div>

                            {(skipReportGov || skipTransparency) && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-blue-600">
                                        ⚠️ Optional metrics skipped - calculated out of {finalScoreData.maxPossiblePoints} points instead of 100
                                    </p>
                                </div>
                            )}

                            {/* Show averaging info if past data exists */}
                            {pastScoringData && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-blue-600">
                                        ⚡ Scores include 30% weight from {pastScoringData.pastScores} previous periods
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Performance Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div>Total Score: {finalScoreData.totalScore.toFixed(1)}/{finalScoreData.maxPossiblePoints || 100}</div>
                                <div>Percentage: {finalScoreData.totalPercentage.toFixed(1)}%</div>
                                <div>Grade: {finalScoreData.totalPercentage >= 90 ? 'A' :
                                    finalScoreData.totalPercentage >= 80 ? 'B' :
                                        finalScoreData.totalPercentage >= 70 ? 'C' :
                                            finalScoreData.totalPercentage >= 60 ? 'D' : 'F'}</div>
                                <div>Status: {finalScoreData.totalPercentage >= 70 ? 'Compliant' : 'Non-Compliant'}</div>
                                {skipReportGov && (
                                    <div className="text-xs text-blue-600">
                                        📊 Adjusted calculation: {finalScoreData.maxPossiblePoints} points maximum
                                    </div>
                                )}
                            </div>

                            {/* Show base vs averaged comparison */}
                            {pastScoringData && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-600">
                                        Base Score: {finalScoreData.baseScores ?
                                            Object.values(finalScoreData.baseScores).reduce((sum, score) => sum + score, 0).toFixed(1) :
                                            finalScoreData.totalScore.toFixed(1)}/{finalScoreData.maxPossiblePoints || 100}
                                    </p>
                                    <p className="text-xs text-blue-600">
                                        With Averaging: {finalScoreData.totalScore.toFixed(1)}/{finalScoreData.maxPossiblePoints || 100}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes and Recommendations */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-3 border rounded-lg"
                                rows={3}
                                placeholder="Add any notes about this scoring..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Recommendations</label>
                            <textarea
                                value={recommendations}
                                onChange={(e) => setRecommendations(e.target.value)}
                                className="w-full p-3 border rounded-lg"
                                rows={3}
                                placeholder="Add recommendations for improvement..."
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={handleSaveScore}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
                        >
                            Save Score
                        </button>
                        <button
                            onClick={onHide}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
