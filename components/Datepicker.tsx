// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
}
export default function DatePicker({
  selected,
  onChange,
  placeholderText = "Select date",
  className
}: DatePickerProps) {
  return <ReactDatePicker selected={selected} onChange={onChange} className={`w-full p-2 border border-gray-300 rounded-md ${className}`} dateFormat="MM/dd/yyyy" placeholderText={placeholderText} />;
}