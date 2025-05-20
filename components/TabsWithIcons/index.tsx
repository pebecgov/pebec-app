"use client";

import React from "react";
import { motion } from "framer-motion"; // ✅ Smooth animations
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function TabsWithIcons({ activeTab, setActiveTab, isUserProfileIncomplete }) {
  const tabs = [
    { id: "report", label: "Submit a complaint", icon: "/images/reportgov.png" },
    { id: "feedback", label: "Feedback", icon: "/images/feedback.png" },
    { id: "status", label: "Complaints", icon: "/images/complaints.png" },
    { id: "profile", label: "Profile", icon: "/images/profile.png" },
  ];

  return (
    <div className="w-full flex justify-center mt-4">
      {/* Full Width and integrated with the banner */}
      <div className="w-full max-w-6xl bg-white p-2 rounded-b-lg shadow-md flex items-center justify-center space-x-4">
        {tabs.map((tab) => (
          <div key={tab.id} className="relative flex items-center justify-center">
            {/* ✅ Profile Tab Info Tooltip (Correctly Positioned) */}
            {tab.id === "profile" && isUserProfileIncomplete && (
              <TooltipProvider>
                <Tooltip>
                
                  <TooltipContent side="bottom" align="center">
                    <p className="text-xs text-white">⚠️ Your profile is incomplete. Update it for full experience.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* ✅ Tab Buttons */}
            <button
  onClick={() => setActiveTab(tab.id)}
  className={`relative flex flex-col lg:flex-row items-center gap-2 px-6 py-3 rounded-md text-center font-medium transition-all duration-300 ${
    activeTab === tab.id
      ? "bg-green-600 text-white border border-green-500"
      : "text-gray-600 hover:bg-gray-200"
  }`}
>
  <img src={tab.icon} alt={tab.label} className="w-6 h-6" />

  <span className="hidden lg:inline">
    {tab.label}
    {tab.id === "profile" && isUserProfileIncomplete && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block ml-1 text-red-500">❗</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p className="text-xs text-white">⚠️ Your profile is incomplete.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </span>

  {activeTab === tab.id && (
    <motion.div
      layoutId="tab-underline"
      className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-700 rounded"
    />
  )}
</button>

          </div>
        ))}
      </div>
    </div>
  );
}
