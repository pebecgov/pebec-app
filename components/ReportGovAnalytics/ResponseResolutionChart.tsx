// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
export default function ResponseResolutionChart() {
  const responseTimes = useQuery(api.tickets.getOverallResponseTimes);
  if (!responseTimes) return <div>Loading resolution chart...</div>;
  const data = responseTimes.map((time, i) => ({
    name: `#${i + 1}`,
    time: Number(time.toFixed(1))
  }));
  return <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Resolution Time (All Tickets)</h3>
      <LineChart width={500} height={250} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis unit="h" />
        <Tooltip />
        <Line type="monotone" dataKey="time" stroke="#4f46e5" />
      </LineChart>
    </div>;
}