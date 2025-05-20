// components/ReportPreview.tsx
import React from "react";

type DLIEntry = {
  dliTitle: string;
  startedBy: string;
  status: "in_progress" | "completed";
  completedSteps: number;
  totalSteps: number;
};

type Props = {
  selectedState: string;
  selectedDLIs: DLIEntry[];
};

export const ReportPreview = React.forwardRef<HTMLDivElement, Props>(
  ({ selectedState, selectedDLIs }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black px-10 py-8"
        style={{
          width: "794px", // A4 width
          height: "1123px", // A4 height
          fontFamily: "sans-serif",
        }}
      >
        <h1 className="text-2xl font-bold mb-2">DLI Status Report</h1>
        <p className="text-sm mb-6">State: <strong>{selectedState}</strong></p>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-2">DLI</th>
              <th className="border p-2">Reform Champion</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Completion</th>
            </tr>
          </thead>
          <tbody>
            {selectedDLIs.map((dli, idx) => {
              const percentage = Math.round((dli.completedSteps / dli.totalSteps) * 100);
              return (
                <tr key={idx}>
                  <td className="border p-2">{dli.dliTitle}</td>
                  <td className="border p-2">{dli.startedBy}</td>
                  <td
                    className={`border p-2 font-medium ${
                      dli.status === "completed" ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {dli.status === "completed" ? "Completed" : "In Progress"}
                  </td>
                  <td
                    className={`border p-2 ${
                      percentage === 100 ? "text-green-700" : "text-yellow-700"
                    }`}
                  >
                    {percentage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-10 text-xs text-gray-500 text-right">
          Generated on: {new Date().toLocaleDateString()}
        </p>
      </div>
    );
  }
);
ReportPreview.displayName = "ReportPreview";
