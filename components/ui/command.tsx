// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import * as React from "react";
type CommandProps = React.HTMLAttributes<HTMLDivElement>;
export function Command({
  children,
  className = "",
  ...props
}: CommandProps) {
  return <div className={`bg-white rounded-md shadow-md border p-2 ${className}`} {...props}>
      {children}
    </div>;
}
export type CommandInputProps = {
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  className?: string;
};
export function CommandInput({
  value,
  onValueChange,
  placeholder,
  className = ""
}: CommandInputProps) {
  return <input type="text" value={value} onChange={e => onValueChange(e.target.value)} className={`w-full border rounded px-3 py-2 text-sm outline-none ${className}`} placeholder={placeholder} />;
}
export function CommandList({
  children
}: {
  children: React.ReactNode;
}) {
  return <div className="max-h-60 overflow-y-auto">{children}</div>;
}
export function CommandItem({
  children,
  onSelect
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return <div className="cursor-pointer px-3 py-2 hover:bg-gray-100 text-sm" onClick={onSelect}>
      {children}
    </div>;
}
export function CommandGroup({
  heading,
  children
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return <div className="mb-2">
      {heading && <div className="text-xs font-semibold px-2 mb-1 text-gray-500">{heading}</div>}
      <div>{children}</div>
    </div>;
}
export function CommandEmpty({
  children
}: {
  children: React.ReactNode;
}) {
  return <div className="px-3 py-2 text-sm text-gray-500">{children}</div>;
}