import React from "react";

interface ProgressProps {
  value: number;
  max: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, max, className }) => {
  const progressPercentage = Math.min((value / max) * 100, 100); // Ensures it doesn't exceed 100%

  return (
    <div className={`relative w-full h-4 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-300 rounded-full"
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );
};
