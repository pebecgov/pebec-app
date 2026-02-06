import React from 'react';
import { RATING_OPTIONS, YES_NO_OPTIONS, HAS_REPORTGOV_QUESTIONS, NO_REPORTGOV_QUESTIONS } from '../../utils/constants';

interface MysteryShoppingModalProps {
    showModal: boolean;
    onClose: () => void;
    mysteryType: 'hasReportGov' | 'noReportGov';
    mysteryRatings: { [key: string]: number };
    onTypeChange: (type: 'hasReportGov' | 'noReportGov') => void;
    onRatingChange: (questionKey: string, rating: number) => void;
    calculateScore: () => number;
    onSave: () => Promise<void>;
}

/**
 * Mystery Shopping Assessment Modal Component
 * Allows scoring of MDAs based on mystery shopping criteria
 */
export const MysteryShoppingModal: React.FC<MysteryShoppingModalProps> = ({
    showModal,
    onClose,
    mysteryType,
    mysteryRatings,
    onTypeChange,
    onRatingChange,
    calculateScore,
    onSave
}) => {
    if (!showModal) return null;

    const questions = mysteryType === 'hasReportGov' ? HAS_REPORTGOV_QUESTIONS : NO_REPORTGOV_QUESTIONS;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                >
                    &times;
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6 text-center">Mystery Shopping Assessment</h2>

                    {/* Type Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Assessment Type:
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="mysteryType"
                                    value="hasReportGov"
                                    checked={mysteryType === 'hasReportGov'}
                                    onChange={() => onTypeChange('hasReportGov')}
                                    className="mr-2"
                                />
                                <span className="text-sm">ReportGov</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="mysteryType"
                                    value="noReportGov"
                                    checked={mysteryType === 'noReportGov'}
                                    onChange={() => onTypeChange('noReportGov')}
                                    className="mr-2"
                                />
                                <span className="text-sm">No ReportGov</span>
                            </label>
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                        {questions.map((question, index) => (
                            <div key={question.key} className="border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-3">
                                    {index + 1}. {question.label}
                                </h3>
                                <div className={`grid gap-2 ${question.type === 'rating' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                                    {(question.type === 'rating' ? RATING_OPTIONS : YES_NO_OPTIONS).map((option) => (
                                        <label key={option.value} className="flex items-center p-2 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={question.key}
                                                value={option.value}
                                                checked={mysteryRatings[question.key] === option.value}
                                                onChange={(e) => onRatingChange(question.key, parseInt(e.target.value))}
                                                className="mr-2"
                                            />
                                            <span className="text-sm">
                                                {question.type === 'rating' ? `${option.value} - ${option.label}` : option.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Score Display */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Score</h3>
                            <div className="text-3xl font-bold text-blue-600">
                                {calculateScore().toFixed(1)}/20
                            </div>
                            <div className="text-sm text-blue-700 mt-1">
                                Average: {((calculateScore() / 20) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg"
                        >
                            Close
                        </button>
                        <button
                            onClick={onSave}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
                        >
                            Save Assessment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
