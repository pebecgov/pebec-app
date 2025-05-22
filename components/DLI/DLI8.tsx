// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
export default function DLI8Page() {
  const router = useRouter();
  return <div className="max-w-5xl mx-auto px-6 py-10 text-gray-800 font-sans mt-25">
      <button onClick={() => router.back()} className="mb-6 flex items-center text-sm text-blue-600 hover:underline">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-4">DLI 8: Quick Determination of Commercial Disputes</h1>
      <p className="text-gray-600 mb-6">
        This DLI supports the establishment and performance of small claims courts, promoting fast and accessible commercial dispute resolution across the state.
      </p>

      {}
      <div className="bg-white shadow-md p-6 rounded-xl border mb-8">
        <h2 className="text-xl font-semibold mb-2">DLR Description</h2>
        <div className="text-sm text-gray-700 space-y-4">
          <p><strong>Years 1 & 2 (2023–2024, One-Time Payment):</strong></p>
          <ul className="list-disc pl-6">
            <li>8.1 Judicial Committee established by Chief Judge to support small claims courts.</li>
            <li>Practice Directions for small claims courts published on the State Judiciary website.</li>
            <li>At least two small claims courts operated and completed at least one case each.</li>
          </ul>

          <p><strong>Year 2 (2024):</strong></p>
          <ul className="list-disc pl-6">
            <li>8.2 Monthly performance reports for 2023 made public by March 2024.</li>
            <li>50% of cases disposed within 60 days (as per disposition reports).</li>
            <li>50% of judgments executed within 30 days (as per execution reports).</li>
          </ul>

          <p><strong>Year 3 (2025):</strong></p>
          <ul className="list-disc pl-6">
            <li>8.3 Monthly performance reports for 2024 made public by March 2025.</li>
            <li>75% of cases disposed within 60 days.</li>
            <li>75% of judgments executed within 30 days.</li>
          </ul>
        </div>
      </div>

      {}
      <div className="bg-green-50 shadow p-6 rounded-xl border mb-10">
        <h2 className="text-lg font-semibold mb-3">Verification Milestones</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>
              Small claims courts operational with at least 1 case tried each — verified for one-time disbursement.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-blue-600 mt-1" size={18} />
            <span>
              Practice directions and judiciary support documents published publicly.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              2024: 50% of small claims cases resolved in 60 days, and 50% of judgments executed in 30 days.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-purple-600 mt-1" size={18} />
            <span>
              2025: ≥75% of cases and judgments resolved/executed within set timelines.
            </span>
          </li>
        </ul>
      </div>

      <div className="text-right">
        <p className="text-xs text-gray-400">Source: SABER Verification Protocol, March 2024</p>
      </div>
    </div>;
}