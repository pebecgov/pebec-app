import React from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function LowestMdaStats() {
    const data = useQuery(api.tickets.getTopAndBottomMdaPerformance);
  
    if (!data) return <div>Loading lowest MDA stats...</div>;
  
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Lowest Performing MDAs</h3>
        <ul className="list-disc pl-5 text-sm text-red-700">
          {data.bottom3.map((mda, i) => (
            <li key={i}>
              {mda.name} — {mda.count} resolved, Avg. time: {(mda.avgTime / 3600000).toFixed(1)} hrs
            </li>
          ))}
        </ul>
      </div>
    );
  }
  