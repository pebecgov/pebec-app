'use client';

import React from 'react';
import { TransparencyItemsState } from '../../utils/types';

interface TransparencyCardProps {
    isLoading: boolean;
    isSaved: boolean;
    skipTransparency: boolean;
    setSkipTransparency: (val: boolean) => void;
    transparencyItems: TransparencyItemsState;
    setTransparencyItems: React.Dispatch<React.SetStateAction<TransparencyItemsState>>;
    transparencyQuestions: Array<{ key: string; label: string }>;
    transparencyScore: number;
    handleSave: () => void;
    selectedMda: string;
}

export default function TransparencyCard({
    isLoading,
    isSaved,
    skipTransparency,
    setSkipTransparency,
    transparencyItems,
    setTransparencyItems,
    transparencyQuestions,
    transparencyScore,
    handleSave,
    selectedMda
}: TransparencyCardProps) {
    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Transparency</h2>
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
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    10 Points
                </span>
            </div>

            <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="transparency-mode"
                        checked={!skipTransparency}
                        onChange={() => setSkipTransparency(false)}
                        className="mr-2"
                    />
                    Evaluate
                </label>
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="transparency-mode"
                        checked={skipTransparency}
                        onChange={() => setSkipTransparency(true)}
                        className="mr-2"
                    />
                    Skip (0 points)
                </label>
            </div>

            <div className={`space-y-2 mb-3 ${skipTransparency ? 'opacity-50 pointer-events-none' : ''}`}>
                {transparencyQuestions.map((question) => (
                    <label key={question.key} className="flex items-center">
                        <input
                            type="checkbox"
                            checked={(transparencyItems as any)[question.key]}
                            onChange={(e) =>
                                setTransparencyItems((prev) => ({
                                    ...prev,
                                    [question.key]: e.target.checked,
                                }))
                            }
                            className="mr-2"
                        />
                        {question.label}
                    </label>
                ))}
            </div>

            <div className="text-center mb-3">
                Score: {transparencyScore.toFixed(1)}/10
            </div>

            <button
                onClick={handleSave}
                disabled={!selectedMda}
                className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${!selectedMda
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                    }`}
            >
                💾 Save
            </button>
        </div>
    );
}
