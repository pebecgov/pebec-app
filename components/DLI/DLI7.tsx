"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DLI7Page() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-gray-800 font-sans mt-25">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-4">DLI 7: Simplified State and Local Business Tax Regimes</h1>
      <p className="text-gray-600 mb-6">
        This DLI supports simplification of business tax processes and promotes the adoption of electronic platforms for tax collection and compliance.
      </p>

      {/* DLR Description */}
      <div className="bg-white shadow-md p-6 rounded-xl border mb-8">
        <h2 className="text-xl font-semibold mb-2">DLR Description</h2>
        <div className="text-sm text-gray-700 space-y-4">
          <p><strong>2023–2025 (One-Time Payment):</strong></p>
          <ul className="list-disc pl-6">
            <li>
              7.1 State enacted/amended legislation to implement presumptive turnover tax for small businesses.
            </li>
            <li>
              At least 3 business-related LG charges/fees subsumed into a single consolidated demand notice.
            </li>
          </ul>

          <p><strong>Year 2 (2024):</strong></p>
          <ul className="list-disc pl-6">
            <li>
              7.2.1 Electronic platform established for collecting annual taxes, levies, charges and fees with QR code or unique payment ID for at least 7 BEE-related MDAs.
            </li>
          </ul>

          <p><strong>Year 3 (2025):</strong></p>
          <ul className="list-disc pl-6">
            <li>
              7.2.2 State and LG taxes/levies/fees payable electronically.
            </li>
            <li>
              <strong>Basic Target:</strong> 7 State-level + 3 LG collectible payments adopt e-receipts.
            </li>
            <li>
              <strong>Stretch Target:</strong> 10 State-level + 3 LG collectible payments adopt e-receipts.
            </li>
          </ul>
        </div>  
      </div>

      {/* ✅ Verification Milestones */}
      <div className="bg-green-50 shadow p-6 rounded-xl border mb-10">
        <h2 className="text-lg font-semibold mb-3">Verification Milestones</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>
              Legislation enacted or amended for presumptive turnover tax regime (one-time achievement).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-blue-600 mt-1" size={18} />
            <span>
              3+ LG tax/fee items consolidated into a single demand notice for simplification.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-purple-600 mt-1" size={18} />
            <span>
              2024: Electronic payment system implemented across at least 7 BEE MDAs with e-receipts.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              2025: Basic Target met with 7 State-level + 3 LG electronic tax adoptions.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-rose-600 mt-1" size={18} />
            <span>
              Stretch Target: 10 State-level + 3 LG tax channels digitized and verified.
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
