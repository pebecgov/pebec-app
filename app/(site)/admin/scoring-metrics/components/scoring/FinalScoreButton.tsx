'use client';

import React from 'react';

interface FinalScoreButtonProps {
    handleCalculateScore: () => void;
    selectedMda: string;
    hasScore?: boolean;
}

export default function FinalScoreButton({
    handleCalculateScore,
    selectedMda,
    hasScore
}: FinalScoreButtonProps) {
    return (
        <div className="w-full flex justify-center mt-8">
            <button
                onClick={handleCalculateScore}
                disabled={!selectedMda || hasScore}
                className={`font-bold py-4 px-8 rounded-lg text-lg shadow-lg transition-all duration-300 transform ${!selectedMda || hasScore
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl hover:scale-105'
                    }`}
            >
                {!selectedMda
                    ? 'Select an MDA First'
                    : hasScore
                        ? 'Score Already Calculated'
                        : 'CALCULATE FINAL SCORE'
                }
            </button>
        </div>
    );
}
