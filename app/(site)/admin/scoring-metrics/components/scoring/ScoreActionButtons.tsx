"use client";

import React from "react";
import { Save, Trash2 } from "lucide-react";

type Props = {
  onSave: () => void;
  onClear?: () => void;
  saveLabel: string;
  disabled?: boolean;
  isSaved?: boolean;
  fullWidth?: boolean;
};

export default function ScoreActionButtons({
  onSave,
  onClear,
  saveLabel,
  disabled = false,
  isSaved = false,
  fullWidth = true,
}: Props) {
  return (
    <div className={`flex gap-2 ${fullWidth ? "w-full" : ""} mt-3`}>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
          disabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600"
        }`}
      >
        <Save className="w-4 h-4" />
        {saveLabel}
      </button>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled || !isSaved}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
            disabled || !isSaved
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600"
          }`}
          title="Clear this saved score. Source data (tickets, reports, files) is kept."
        >
          <Trash2 className="w-4 h-4" />
          Clear Score
        </button>
      )}
    </div>
  );
}
