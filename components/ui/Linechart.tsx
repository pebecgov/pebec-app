// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";
import { useMemo } from "react";
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);
type Report = {
  submittedAt: number;
};
type Props = {
  data: Report[];
};
export default function LineChart({
  data
}: Props) {
  const groupedData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(report => {
      const date = format(new Date(report.submittedAt), "MMM d");
      counts[date] = (counts[date] || 0) + 1;
    });
    const labels = Object.keys(counts).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
    return {
      labels,
      datasets: [{
        label: "Reports Submitted",
        data: labels.map(label => counts[label]),
        fill: false,
        borderColor: "#22c55e",
        backgroundColor: "#22c55e",
        tension: 0.3
      }]
    };
  }, [data]);
  return <div className="w-full max-w-4xl mx-auto">
      <Line data={groupedData} options={{
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }} />
    </div>;
}