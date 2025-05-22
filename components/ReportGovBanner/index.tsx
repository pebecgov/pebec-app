// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
export default function HeroSection() {
  const router = useRouter();
  const handleRedirect = () => {
    router.push("/reportgov-ng");
  };
  return <div className="w-full flex justify-center bg-[#1A1F2B] py-6 px-4">
      {}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between px-6 lg:px-10 py-5 bg-[#111827] text-white rounded-lg shadow-md space-y-4 lg:space-y-0">
        
        {}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-white" />
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-lg lg:text-2xl font-semibold">
              <span className="text-red-500">ReportGov</span> - Your Voice, Our Commitment.
            </h2>
            <p className="text-sm text-gray-300 mt-1 max-w-xs lg:max-w-none">
              Report issues, share concerns, and help improve governance.
            </p>
          </div>
        </div>

        {}
        <div className="w-full lg:w-auto flex justify-center lg:justify-end">
          <button onClick={handleRedirect} className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-6 rounded-lg text-sm lg:text-base transition-all w-full lg:w-auto">
            Find out more
          </button>
        </div>

      </div>
    </div>;
}