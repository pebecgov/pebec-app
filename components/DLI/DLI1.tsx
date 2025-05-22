// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
export default function DLI1Page() {
  const router = useRouter();
  return <div className="max-w-5xl mx-auto px-6 py-10 text-gray-800 font-sans mt-25">
      <button onClick={() => router.back()} className="mb-6 flex items-center text-sm text-blue-600 hover:underline">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-4">
        DLI 1: Improved Efficiency in Property Registration and Sustainability of the Land-Based Investment Process
      </h1>
      <p className="text-gray-600 mb-6">
        This DLI aims to improve land administration systems through transparency, digitization, and adoption of best practices for land-intensive agricultural investments.
      </p>

      <div className="bg-white shadow-md p-6 rounded-xl border mb-8">
        <h2 className="text-xl font-semibold mb-2">DLR Description (from DLI Matrix)</h2>
        <div className="text-sm text-gray-700 space-y-4">
          <p><strong>Prior Result:</strong></p>
          <ul className="list-disc pl-6">
            <li>1.1.1 Published on state official website:
              <ul className="list-disc pl-6">
                <li>Process for obtaining Certificates of Occupancy (CofOs), including all relevant MDAs, time frames, and costs</li>
                <li>Process for obtaining Construction Permits, including all relevant MDAs, time frames, and costs</li>
                <li>Number of CofOs registered (Jan 1, 2012 – Dec 31, 2021), number of digitized CofOs in a searchable archive, number of female/jointly owned CofOs registered (Jan 1, 2021 – Dec 31, 2021)</li>
              </ul>
            </li>
          </ul>

          <p><strong>Year 1 (2023):</strong></p>
          <ul className="list-disc pl-6">
            <li>1.1.2. Published on state website:
              <ul className="list-disc pl-6">
                <li>Process for obtaining CofO including all relevant MDAs, time frames and costs</li>
                <li>Process for obtaining Construction Permits including all relevant MDAs, time frames and costs</li>
              </ul>
            </li>
            <li>Terms of References (TOR) completed for creation of digital archive of CofOs, with international standard searchable index</li>
          </ul>

          <p><strong>Year 2 (2024):</strong></p>
          <ul className="list-disc pl-6">
            <li>1.1.3. Published on state website:
              <ul className="list-disc pl-6">
                <li>Process for obtaining CofOs and Construction Permits as above</li>
              </ul>
            </li>
            <li>Digitization and indexing of existing CofOs (Jan 1, 2012 – Dec 31, 2024) in digital archive</li>
            <li>Basic target: 50%-70% of CofOs digitized</li>
            <li>Stretch target: 71%-100% of CofOs digitized</li>
            <li>1.2.1 FRILIA or equivalent adopted by executive order</li>
          </ul>

          <p><strong>Year 3 (2025):</strong></p>
          <ul className="list-disc pl-6">
            <li>1.1.4. Published on state website:
              <ul className="list-disc pl-6">
                <li>Process for obtaining CofOs and Construction Permits (as above)</li>
              </ul>
            </li>
            <li>New CofOs (Jan 1 – Dec 31, 2025) digitized and indexed on an ongoing basis</li>
            <li>Target: At least 90% of new CofOs digitized</li>
            <li>15% increase (from 2021) in share of female-owned or female joint/co-owned CofOs by 2025</li>
            <li>1.2.2 FRILIA satisfactorily implemented with at least one pilot investment</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-6">
        <p className="text-sm">
          <strong>FRILIA</strong> (Framework for Responsible and Inclusive Land-Intensive Agriculture) must be adopted through a State Executive Order and implemented in at least one investment case by Year 3.
        </p>
      </div>

      <div className="bg-white shadow p-6 rounded-xl border mb-6">
        <h2 className="text-lg font-semibold mb-3">Verification Milestones Summary</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span><strong>Prior Result:</strong> CofO and Permit procedures published, with digitization statistics (2012–2021)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-600 mt-1" size={18} />
            <span><strong>Year 1:</strong> Updated procedures published, TOR for archive completed</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span><strong>Year 2:</strong> 50%–100% of CofOs digitized, FRILIA adopted</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-yellow-600 mt-1" size={18} />
            <span><strong>Year 3:</strong> 90% of 2025 CofOs digitized, 15% increase in female-owned CofOs, FRILIA pilot implemented</span>
          </li>
        </ul>
      </div>

      <div className="text-right">
        <p className="text-xs text-gray-400">Source: SABER Verification Protocol, March 2024</p>
      </div>
    </div>;
}