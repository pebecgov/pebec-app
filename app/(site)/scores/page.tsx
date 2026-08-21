"use client";

import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";

export default function ScoresLandingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#006B3F] mb-2">
          2026 Assessment
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">PEBEC Performance Tracker</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Track Nigerian state business climate rankings and federal MDA service delivery scores
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link
          href="/scores/states"
          className="group bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-[#006B3F]/30 transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006B3F] to-[#008B52]" />
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-[#006B3F]/10 rounded-xl text-[#006B3F]">
              <MapPin className="w-8 h-8" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#006B3F] group-hover:translate-x-1 transition-all" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 group-hover:text-[#006B3F] transition-colors">
            State Rankings
          </h2>
          <p className="text-gray-500 mt-2">
            Nigerian state performance across business climate indicators
          </p>
        </Link>

        <Link
          href="/scores/mdas"
          className="group bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-[#006B3F]/30 transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006B3F] to-[#008B52]" />
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-[#006B3F]/10 rounded-xl text-[#006B3F]">
              <Building2 className="w-8 h-8" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#006B3F] group-hover:translate-x-1 transition-all" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 group-hover:text-[#006B3F] transition-colors">
            MDA Performance
          </h2>
          <p className="text-gray-500 mt-2">
            Federal agency rankings for service delivery and efficiency
          </p>
        </Link>
      </div>
    </div>
  );
}
