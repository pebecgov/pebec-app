"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DLI6Page() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-gray-800 font-sans mt-25">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-4">
        DLI 6: Transparency of Fees for Inter-State Trade & Export Certification
      </h1>
      <p className="text-gray-600 mb-6">
        This DLI aims to streamline trade-related fees and levies for inter-state commerce while supporting export certification
        and trade facilitation reforms.
      </p>

      {/* DLR Description */}
      <div className="bg-white shadow-md p-6 rounded-xl border mb-8">
        <h2 className="text-xl font-semibold mb-2">DLR Description</h2>
        <div className="text-sm text-gray-700 space-y-4">
          <p><strong>Prior Result:</strong></p>
          <ul className="list-disc pl-6">
            <li>6.1.1 Publish schedule of trade-related fees/levies on inter-state movement of goods on state websites.</li>
          </ul>

          <p><strong>Year 1 (2023):</strong></p>
          <ul className="list-disc pl-6">
            <li>6.1.2 Maintain published fee schedule and establish GRM (hotline/SMS) for traders.</li>
            <li>6.2.1 Allocate budget to SCEP and publish a state export strategy and guidelines.</li>
          </ul>

          <p><strong>Year 2 (2024):</strong></p>
          <ul className="list-disc pl-6">
            <li>6.1.3 Publish consolidated fee schedule and report complaints/redress actions online.</li>
            <li>≥50% of grievances addressed within GRM SLA.</li>
            <li>6.2.2 At least 10% increase in firms with NEPC export certificates vs. baseline.</li>
          </ul>

          <p><strong>Year 3 (2025):</strong></p>
          <ul className="list-disc pl-6">
            <li>6.1.4 Maintain updated fee schedule and report redress actions online.</li>
            <li>≥75% of grievances resolved per SLA.</li>
            <li>Eliminate haulage fees and charges.</li>
            <li>6.2.3 At least 20% increase in NEPC-certified firms vs. baseline.</li>
          </ul>
        </div>
      </div>

      {/* ✅ Verification Milestones */}
      <div className="bg-green-50 shadow p-6 rounded-xl border mb-10">
        <h2 className="text-lg font-semibold mb-3">Verification Milestones</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>Fee and levy schedules for inter-state trade published and updated across all years.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>GRM system for traders established with SMS/hotline and improved resolution rates (50% → 75%).</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>State export strategy and guidelines published and implemented by SCEP.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-blue-600 mt-1" size={18} />
            <span>10% increase in NEPC-certified firms in 2024, and 20% by 2025.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-red-600 mt-1" size={18} />
            <span>Haulage fees and charges eliminated for trade facilitation.</span>
          </li>
        </ul>
      </div>

      <div className="text-right">
        <p className="text-xs text-gray-400">Source: SABER Verification Protocol, March 2024</p>
      </div>
    </div>
  );
}
