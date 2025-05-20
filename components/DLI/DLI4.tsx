"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DLI4Page() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-gray-800 font-sans mt-25">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-4">DLI 4: Improved Investment Promotion Environment</h1>
      <p className="text-gray-600 mb-6">
        This DLI aims to strengthen investment promotion agencies (IPAs), improve online transparency,
        and support investors' access to credit and incentives.
      </p>

      <div className="bg-white shadow-md p-6 rounded-xl border mb-8">
        <h2 className="text-xl font-semibold mb-2">DLR Description</h2>
        <div className="text-sm text-gray-700 space-y-4">
          <p><strong>Prior Result:</strong></p>
          <ul className="list-disc pl-6">
            <li>4.1 Inventory of all investment incentives published online (Federal & State), including sectors, eligibility, benefits, and other criteria.</li>
          </ul>

          <p><strong>Year 1 (2023):</strong></p>
          <ul className="list-disc pl-6">
            <li>4.2 Inventory updated and published with incentive recipient counts.</li>
            <li>IPA mandated and designated online guide including credit access published.</li>
          </ul>

          <p><strong>Year 2 (2024):</strong></p>
          <ul className="list-disc pl-6">
            <li>4.3 Further updates to inventory and incentive recipients published.</li>
            <li>IPA hosts at least 2 sessions to help investors access credit institutions.</li>
          </ul>

          <p><strong>Year 3 (2025):</strong></p>
          <ul className="list-disc pl-6">
            <li>4.4 Inventory updated again; aftercare and retention program adopted by IPA.</li>
            <li>Announced investments supported by IPA: 1–4 (basic), 5+ (stretch).</li>
          </ul>
        </div>
      </div>

      {/* ✅ VERIFICATION MILESTONES SECTION */}
      <div className="bg-green-50 shadow p-6 rounded-xl border mb-10">
        <h2 className="text-lg font-semibold mb-3">Verification Milestones</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>
              Online publication of complete investment incentive inventories (Federal and State level).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>
              IPA performs key functions and conducts outreach to link investors to credit.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              Adoption of aftercare & retention program by the IPA.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              Targeted number of new investments announced and supported.
            </span>
          </li>
        </ul>
      </div>

      <div className="text-right">
        <p className="text-xs text-gray-400">Source: SABER Verification Protocol, March 2024</p>
      </div>
    </div>
  );
}
