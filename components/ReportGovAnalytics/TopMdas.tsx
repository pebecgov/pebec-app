"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TopMdaStats() {
  const data = useQuery(api.tickets.getTopAndBottomMdaPerformance);

  if (!data) return <div>Loading top MDA stats...</div>;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Top Performing MDAs</h3>
      <ul className="list-disc pl-5 text-sm text-green-700">
        {data.top3.map((mda, i) => (
          <li key={i}>
            {mda.name} — {mda.count} resolved, Avg. time: {(mda.avgTime / 3600000).toFixed(1)} hrs
          </li>
        ))}
      </ul>
    </div>
  );
}
