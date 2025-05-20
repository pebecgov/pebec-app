"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ReportCard from "@/components/ReportCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Id } from "@/convex/_generated/dataModel";

interface Report {
  _id: Id<"reports">;
  title: string;
  description: string;
  fileId: Id<"_storage">;
  fileSize: number;
  publishedAt: number;
  uploadedBy: Id<"users">;
  reportCoverUrl?: Id<"_storage">;
}

export default function ReportsPage() {
  const allReports = (useQuery(api.reports.getAllReports) || []) as Report[];

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // ✅ Use useMemo to prevent infinite loops
  const filteredReports = useMemo(() => {
    if (!allReports) return [];

    let results = allReports.filter((report) =>
      report.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (startDate && endDate) {
      results = results.filter(
        (report) =>
          report.publishedAt >= startDate.getTime() &&
          report.publishedAt <= endDate.getTime()
      );
    }

    return results;
  }, [searchQuery, startDate, endDate, allReports]); // ✅ Dependencies are managed correctly

  return (
    <main className="pb-16 mt-25">
      {/* ✅ Banner Section */}
      <section
        className="relative bg-cover bg-center text-white flex items-center justify-center px-6 py-20"
        style={{ backgroundImage: "url('/images/reports-banner.jpg')" }}
      >
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-extrabold">PEBEC Reports</h1>
          <p className="text-lg text-gray-200 mt-2">
            Explore and download all official reports from PEBEC.
          </p>
          {/* ✅ Centered Search Bar Under Title */}
          <div className="mt-6 flex justify-center">
            <div
              className="relative flex items-center w-full max-w-lg bg-[#73781d] shadow-[2px_2px_20px_rgba(0,0,0,0.08)] rounded-full overflow-hidden transition-all duration-300 hover:w-[350px]"
            >
              {/* Search Icon */}
              <div className="flex items-center justify-center p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  className="fill-white"
                >
                  <path
                    d="M18.9,16.776A10.539,10.539,0,1,0,16.776,18.9l5.1,5.1L24,21.88ZM10.5,18A7.5,7.5,0,1,1,18,10.5,7.507,7.507,0,0,1,10.5,18Z"
                  ></path>
                </svg>
              </div>

              {/* Search Input */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full bg-transparent outline-none text-white text-lg px-4 placeholder-white"
              />
            </div>
          </div>
        </div>
        {/* ✅ Right Side Image */}
        <div className="absolute right-10 bottom-10 hidden md:block">
          <img src="/images/report-icon.png" alt="Reports Icon" className="w-32 opacity-80" />
        </div>
      </section>

      {/* ✅ Filters Section */}
      <div className="container mx-auto px-6 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100 p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <label className="font-medium">From Date:</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="Select Start Date"
            className="p-2 border border-gray-300 rounded-md text-black"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-medium">To Date:</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            placeholderText="Select End Date"
            className="p-2 border border-gray-300 rounded-md text-black"
          />
        </div>
      </div>

      {/* ✅ Reports List */}
      <section className="container mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredReports.map((report) => (
            <ReportCard key={report._id} report={report} />
          ))}
        </div>
      </section>
    </main>
  );
}
