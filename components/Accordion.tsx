import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionItemProps {
  title: string;
  fullText: string;
  icon?: ReactNode;
}

export function AccordionItem({ title, fullText, icon }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const previewText = fullText.split(" ").slice(0, 15).join(" ") + "..."; // ✅ Show first 15 words

  return (
    <div className="border border-gray-200 rounded-lg shadow-md">
      <button
        className="flex justify-between items-center w-full p-4 text-left text-lg font-semibold text-gray-900 hover:bg-gray-100 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-green-600 w-8 h-8">{icon}</span>}
          {title}
        </div>
        <ChevronDown className={`w-6 h-6 transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div className={`p-4 text-gray-700 text-lg bg-gray-50 rounded-lg ${isOpen ? "block" : "hidden"}`}>
        {fullText}
      </div>
      {!isOpen && (
        <p className="p-4 text-gray-600">{previewText}</p> // ✅ Show preview when closed
      )}
    </div>
  );
}

export function Accordion({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">{children}</div>; // ✅ 2 Columns on Large Screens
}
