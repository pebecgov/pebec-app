'use client';

import React from 'react';

interface MysteryShoppingCardProps {
    isLoading: boolean;
    isSaved: boolean;
    setShowRanking: (show: boolean) => void;
    setShowModal: (show: boolean) => void;
    score: number;
    handleSave: () => void;
    selectedMda: string;
    hasRatings: boolean;
    maxPoints?: number; // Dynamic max points from config
}

export default function MysteryShoppingCard({
    isLoading,
    isSaved,
    setShowRanking,
    setShowModal,
    score,
    handleSave,
    selectedMda,
    hasRatings,
    maxPoints = 20 // Default to 20 for 2025
}: MysteryShoppingCardProps) {
    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Mystery Shopping</h2>
                    {isLoading && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            🔄 Loading...
                        </span>
                    )}
                    {!isLoading && isSaved && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            💾 Saved
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowRanking(true)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        title="View all MDAs ranked by Mystery Shopping score"
                    >
                        📊 Rankings
                    </button>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {maxPoints} Points
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Open Mystery Shopping Assessment
                </button>


                <div className="text-center">
                    Score: {score.toFixed(1)}/{maxPoints}
                </div>

                <button
                    onClick={handleSave}
                    disabled={!selectedMda || !hasRatings}
                    className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${!selectedMda || !hasRatings
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                        }`}
                >
                    💾 Save
                </button>
            </div>
        </div>
    );
}
