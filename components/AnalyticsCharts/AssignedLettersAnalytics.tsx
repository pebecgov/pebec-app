// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const COLORS = ["#FFBB28", "#8884d8", "#00C49F", "#FF8042"];
const STATUS_LABELS = {
  pending: "Waiting for Ack",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved"
};
export default function LetterStatsDashboard() {
  const stats = useQuery(api.letters.getBusinessLetterStats);
  if (!stats) return <div>Loading...</div>;
  const data = [{
    name: STATUS_LABELS.pending,
    value: stats.pending
  }, {
    name: STATUS_LABELS.acknowledged,
    value: stats.acknowledged
  }, {
    name: STATUS_LABELS.in_progress,
    value: stats.in_progress
  }, {
    name: STATUS_LABELS.resolved,
    value: stats.resolved
  }];
  const userBreakdown = stats.userBreakdown || {};
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="flex flex-col justify-between">
        <CardHeader>
          <CardTitle>Total Letters Assigned</CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-5xl font-bold mb-2">{stats.total}</h2>
          <p className="text-gray-500 text-sm">In the last 30 days</p>

          <div className="mt-4 space-y-3">
            {Object.entries(userBreakdown as Record<string, {
            streams: Record<string, number>;
          }>).map(([userName, info]) => <div key={userName}>
                  <h4 className="font-medium capitalize">{userName}</h4>
                  <ul className="ml-4 list-disc text-sm text-gray-600">
                    {Object.entries(info.streams).map(([stream, count]) => <li key={stream}>
                        {stream} — {count} letter{count > 1 ? "s" : ""}
                      </li>)}
                  </ul>
                </div>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Letter Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>;
}