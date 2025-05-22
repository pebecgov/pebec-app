// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
export default function DLI2Page() {
  const router = useRouter();
  return <div className="max-w-5xl mx-auto px-6 py-10 text-gray-800 font-sans mt-25">
      <button onClick={() => router.back()} className="mb-6 flex items-center text-sm text-blue-600 hover:underline">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-4">
        DLI 2: Improved Regulatory Framework for Private Investment in Fiber Optic Infrastructure
      </h1>
      <p className="text-gray-600 mb-6">
        This DLI aims to reduce the cost and improve the efficiency of deploying fiber optic infrastructure by capping fees, improving transparency, and increasing total deployment.
      </p>

      <div className="bg-white shadow-md p-6 rounded-xl border mb-8">
        <h2 className="text-xl font-semibold mb-2">DLR Description (from DLI Matrix)</h2>
        <div className="text-sm text-gray-700 space-y-4">
          <p><strong>Year 1 (2023):</strong></p>
          <ul className="list-disc pl-6">
            <li>2.1 State amended or passed legislation to adopt NGN145/meter max fees for fiber optic deployment</li>
            <li>Published online: process for obtaining RoW including MDAs, timeframes, costs</li>
          </ul>

          <p><strong>Year 2 (2024):</strong></p>
          <ul className="list-disc pl-6">
            <li>2.2 Maintained NGN145/meter cap; published RoW processes and fees online</li>
            <li>Published: Approved RoW-related requests by operators</li>
          </ul>

          <p><strong>Year 3 (2025):</strong></p>
          <ul className="list-disc pl-6">
            <li>2.3 Maintained NGN145/meter cap, published RoW processes, fees, and approved requests</li>
            <li>Target: Increase in total deployed fiber optic km over 2022 baseline
              <ul className="pl-6">
                <li>Basic: 20%–99%</li>
                <p>Target: &gt;100%</p> 
                </ul>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white shadow p-6 rounded-xl border mb-6">
        <h2 className="text-lg font-semibold mb-3">Verification Milestones</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>
              <strong>2023:</strong> Cap fees at NGN145/meter via regulation and publish RoW process online.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              <strong>2024:</strong> Maintain cap and publish fees/process + approved RoW requests.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              <strong>2025:</strong> Maintain cap and report increase in fiber optic deployment.
            </span>
          </li>
        </ul>
      </div>

      <div className="text-right">
        <p className="text-xs text-gray-400">Source: SABER Verification Protocol, March 2024</p>
      </div>
    </div>;
}