// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import UserDLIReportModal from "./GenerateReportDLIReformChampion";
export default function DLIStatusCard({
  state
}: {
  state: string;
}) {
  const [openModal, setOpenModal] = useState(false);
  const stateDLIs = useQuery(api.dli.getStateDLIsReformChampion, {
    state
  });
  const activeCount = stateDLIs?.filter(dli => dli.status === "in_progress" || dli.status === "completed").length || 0;
  return <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {}
        <div className="bg-white p-6 shadow rounded-xl flex flex-col justify-between">
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            Active DLIs in {state}
          </h2>
          <p className="text-4xl font-extrabold text-green-600">{activeCount}</p>
        </div>

        {}
        <div className="bg-white p-6 shadow rounded-xl flex flex-col justify-between">
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            Generate My DLI Report
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Download a personal PDF summary of your DLI progress in{" "}
            <span className="font-semibold">{state}</span>.
          </p>
          <button onClick={() => setOpenModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition">
            📄 Generate Report
          </button>
        </div>
      </div>

      {}
      <UserDLIReportModal open={openModal} onClose={() => setOpenModal(false)} />
    </>;
}