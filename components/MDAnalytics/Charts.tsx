// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Gauge, Medal } from "lucide-react";
export default function MDAStats() {
  const stats = useQuery(api.tickets.getMDAIncidentsStat) || {
    totalAssigned: 0,
    resolved: 0,
    unresolved: 0,
    resolvedPercentage: 0,
    score: 10
  };
  const statsData = [{
    title: "Tickets Progress",
    value: `${stats.resolvedPercentage}%`,
    icon: <Gauge className="w-6 h-6 text-white" />,
    color: "bg-blue-500",
    progressBar: true
  }, {
    title: "Your Score",
    value: `${stats.score} pts`,
    icon: <Medal className="w-6 h-6 text-white" />,
    color: stats.score > 0 ? "bg-green-500" : "bg-red-500",
    message: stats.score > 0 ? "Keep up the great work! 🎉" : "Resolve tickets faster! 😞"
  }];
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {statsData.map((stat, index) => <div key={index} className="relative bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${stat.color} flex items-center justify-center`}>
              {stat.icon}
            </div>
            <div>
              <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>

          {}
          {stat.progressBar && <div className="mt-4">
              <div className="relative w-full bg-gray-200 h-2 rounded-full">
                <div className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all" style={{
            width: `${stats.resolvedPercentage}%`
          }} />
              </div>
            </div>}

          {}
          {stat.message && <p className="text-sm text-gray-600 mt-2">{stat.message}</p>}
        </div>)}
    </div>;
}