// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import reformsData from "./ReformList";
import { FaBuilding, FaIndustry, FaRegChartBar, FaLandmark, FaUserShield, FaGavel, FaHandshake, FaShippingFast, FaBolt, FaPeopleArrows, FaDoorOpen, FaSellsy } from "react-icons/fa";
type ReformListProps = {
  searchQuery: string;
  defaultExpanded?: string | null;
};
const categoryIcons: Record<string, any> = {
  A: FaBuilding,
  B: FaIndustry,
  C: FaBolt,
  D: FaLandmark,
  E: FaUserShield,
  F: FaGavel,
  G: FaHandshake,
  H: FaShippingFast,
  I: FaRegChartBar,
  J: FaDoorOpen,
  K: FaSellsy,
  L: FaPeopleArrows
};
export default function ReformGroup({
  searchQuery,
  defaultExpanded
}: ReformListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(defaultExpanded);
    }
  }, [defaultExpanded]);
  const filteredData = useMemo(() => {
    if (!searchQuery) return reformsData;
    return reformsData.map(section => {
      const matches = section.reforms.filter(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
      if (matches.length === 0) return null;
      return {
        ...section,
        reforms: matches
      };
    }).filter(Boolean) as typeof reformsData;
  }, [searchQuery]);
  return <div className="w-full space-y-4">
      {filteredData.map(section => {
      const Icon = categoryIcons[section.letter] || FaRegChartBar;
      const isOpen = expanded === section.letter;
      return <Disclosure key={section.letter} as="div">
  {({
          open
        }) => {
          const forceOpen = expanded === section.letter;
          return <div className="bg-white rounded-lg shadow">
        <Disclosure.Button onClick={() => setExpanded(forceOpen ? null : section.letter)} className={`w-full flex justify-between items-center px-5 py-4 rounded-lg border transition-all duration-200 ${forceOpen ? "bg-green-50 border-green-200 shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">
              <Icon />
            </span>
            <span className="font-semibold text-gray-900 text-[17px]">
              {section.letter}. {section.name}
            </span>
          </div>
          <span className={`transform transition-transform duration-300 ${forceOpen ? "rotate-180" : ""}`}>
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </span>
        </Disclosure.Button>

        {forceOpen && <div className="px-6 pb-5 pt-2 text-gray-700 text-sm border-t border-gray-100">
            <ul className="list-disc space-y-2 ml-6">
              {section.reforms.map((reform, i) => <li key={i}>{reform}</li>)}
            </ul>
          </div>}
      </div>;
        }}
      </Disclosure>;
    })}
    </div>;
}