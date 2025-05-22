// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
export default function DLI3Page() {
  const router = useRouter();
  return <div className="max-w-5xl mx-auto px-6 py-10 text-gray-800 font-sans mt-25">
      <button onClick={() => router.back()} className="mb-6 flex items-center text-sm text-blue-600 hover:underline">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-4">
        DLI 3: Development of an Effective PPP Framework
      </h1>
      <p className="text-gray-600 mb-6">
        This DLI focuses on establishing and strengthening the state-level frameworks for public-private partnerships (PPPs), ensuring climate screening, transparency, and sustainable funding for infrastructure and service delivery projects.
      </p>

      <div className="bg-white shadow-md p-6 rounded-xl border mb-8">
        <h2 className="text-xl font-semibold mb-2">DLR Description (from DLI Matrix)</h2>
        <div className="text-sm text-gray-700 space-y-4">
          <p><strong>Year 1 (2023):</strong></p>
          <ul className="list-disc pl-6">
            <li>3.1 State-level technical PPP coordination unit/agency mandated as the lead organization for PPP facilitation</li>
            <li>PPP pipeline adopted and disclosed, with at least 50% of projects screened for climate adaptation and mitigation</li>
          </ul>

          <p><strong>Year 2 (2024):</strong></p>
          <ul className="list-disc pl-6">
            <li>3.2 PPP coordination unit/agency established or maintained</li>
            <li>State website publishes:
              <ul className="list-disc pl-6">
                <li>PPP Fiscal Commitment and Contingent Liability (FCCL) Management Framework</li>
                <li>PPP legal and institutional framework (including guidelines and manual)</li>
                <li>PPP disclosure framework</li>
              </ul>
            </li>
            <li>Web-based disclosure portal publishes pipeline PPP projects</li>
          </ul>

          <p><strong>Year 3 (2025):</strong></p>
          <ul className="list-disc pl-6">
            <li>3.3 PPP coordination unit/agency maintained</li>
            <li>State Project Facilitation Fund established with minimum funding of 3% of total pipeline capital investment</li>
          </ul>
        </div>
      </div>

      <div className="bg-white shadow p-6 rounded-xl border mb-6">
        <h2 className="text-lg font-semibold mb-3">Verification Milestones</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span>
              <strong>Year 1:</strong> PPP agency designated, pipeline published with 50% climate-screened.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              <strong>Year 2:</strong> Frameworks published online; disclosure portal operational.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span>
              <strong>Year 3:</strong> PPP agency maintained; facilitation fund funded at ≥3% of pipeline value.
            </span>
          </li>
        </ul>
      </div>

      <div className="text-right">
        <p className="text-xs text-gray-400">Source: SABER Verification Protocol, March 2024</p>
      </div>
    </div>;
}