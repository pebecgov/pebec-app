"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import StateScoringForm from "@/components/Admin/StateScoringForm";

// Grade calculation function
const calculateGrade = (totalScore: number, maxPossibleScore: number = 100): { grade: string; description: string } => {
  const percentage = (totalScore / maxPossibleScore) * 100;
  
  if (percentage >= 90) return { grade: "A", description: "Excellent" };
  if (percentage >= 80) return { grade: "B", description: "Good" };
  if (percentage >= 70) return { grade: "C", description: "Satisfactory" };
  if (percentage >= 60) return { grade: "D", description: "Below Average" };
  return { grade: "F", description: "Poor" };
};

// Rankings Table Component
const RankingsTable = () => {
  const rankings = useQuery(api.state_scores.getStateRankings);

  if (rankings === undefined) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <p className="text-gray-600">No rankings available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                State
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankings.map((ranking, index) => {
              const { grade, description } = calculateGrade(ranking.totalScore);
              const isTopThree = index < 3;
              
              return (
                <tr key={ranking.state} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                    <div className="flex items-center justify-center">
                      {isTopThree && (
                        <span className="mr-2">
                          {index === 0 && "🥇"}
                          {index === 1 && "🥈"}
                          {index === 2 && "🥉"}
                        </span>
                      )}
                      #{ranking.rank}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ranking.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-mono">
                    {ranking.totalScore.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      grade === "A" ? "bg-green-100 text-green-800" :
                      grade === "B" ? "bg-blue-100 text-blue-800" :
                      grade === "C" ? "bg-yellow-100 text-yellow-800" :
                      grade === "D" ? "bg-orange-100 text-orange-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {grade} - {description}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {rankings.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Showing {rankings.length} states with available scores
          </p>
        </div>
      )}
    </div>
  );
};

export default function StateScoringPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("scoring");

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">State Scoring & Rankings</h1>
        <p className="text-gray-600">Score states and view performance rankings</p>
      </div>

      {/* Tab Navigation */}
      <div className="w-full mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("scoring")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "scoring"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Score States
            </button>
            <button
              onClick={() => setActiveTab("rankings")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "rankings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Rankings
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "scoring" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Score States</h2>
            <StateScoringForm />
          </div>
        )}

        {activeTab === "rankings" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">State Rankings</h2>
            <RankingsTable />
          </div>
        )}
      </div>
    </div>
  );
}
