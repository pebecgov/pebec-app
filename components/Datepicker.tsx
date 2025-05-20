"use client";

import React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string; // ✅ Accept className
}

export default function DatePicker({ selected, onChange, placeholderText = "Select date", className }: DatePickerProps) {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      className={`w-full p-2 border border-gray-300 rounded-md ${className}`} // ✅ Apply custom styles
      dateFormat="MM/dd/yyyy"
      placeholderText={placeholderText}
    />
  );
}
