// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
export default function DLIProgressChart() {
  const user = useQuery(api.users.getCurrentUsers);
  const allProgress = useQuery(api.dli.getAllUserDLIProgress) || [];
  const templates = useQuery(api.dli.getAllDliTemplates) || [];
  const chartData = (user ? allProgress.filter(dli => dli.state === user.state) : []).map(dli => {
    const template = templates.find(t => t._id === dli.dliTemplateId);
    const title = template?.title || "Untitled DLI";
    return {
      name: title.length > 30 ? title.slice(0, 30) + "..." : title,
      percent: Math.round(dli.completedSteps / dli.totalSteps * 100)
    };
  });
  return <div className="bg-white p-6 shadow rounded-xl w-full">
      <h2 className="text-lg font-bold mb-4 text-gray-800">DLI Progress</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis unit="%" />
          <Tooltip formatter={(value: number) => [`${value}%`, "Progress"]} labelFormatter={(label: string) => `DLI: ${label}`} />
          <Bar dataKey="percent" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>;
}