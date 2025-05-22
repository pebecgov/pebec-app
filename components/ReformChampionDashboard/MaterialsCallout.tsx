// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import Link from "next/link";
export default function MaterialsCallout() {
  return <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 p-6 rounded-xl shadow">
      <h3 className="text-lg font-bold text-blue-800">📚 Check Out SABER Materials</h3>
      <p className="text-sm text-blue-600 mt-2">Stay up to date with guides, instructions, and supporting documents.</p>
      <Link href="/saber_agent/materials" className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
        View Materials
      </Link>
    </div>;
}