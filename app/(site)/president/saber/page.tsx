"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GenerateReportModal } from "@/components/GenerateDLIReportAdmin";

const nigeriaStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const PAGE_SIZE = 25;

export default function DLIProgressTable() {
  const allDLIs = useQuery(api.dli.getAllStateDLIs);
  const dliTitles = useQuery(api.dli.getAllDLITitles);

  const [selectedState, setSelectedState] = useState("All States");
  const [selectedDLI, setSelectedDLI] = useState("All DLIs");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [reformChampionSearch, setReformChampionSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  if (!allDLIs || !dliTitles) return <p className="p-4">Loading...</p>;

  const activeDLIs = allDLIs.filter((dli) => dli.status === "in_progress" || dli.status === "completed");
  const completedDLIs = allDLIs.filter((dli) => dli.status === "completed");

  const filtered = activeDLIs.filter((dli) => {
    const matchState = selectedState === "All States" || dli.userState === selectedState;
    const matchDLI = selectedDLI === "All DLIs" || dli.dliTitle === selectedDLI;
    const matchStatus = selectedStatus === "All" || dli.status === selectedStatus;
    const matchChampion = dli.startedBy.toLowerCase().includes(reformChampionSearch.toLowerCase());
    return matchState && matchDLI && matchStatus && matchChampion;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const totalSteps = activeDLIs.reduce((sum, d) => sum + d.totalSteps, 0);
  const completedSteps = activeDLIs.reduce((sum, d) => sum + d.completedSteps, 0);

  // ✅ State-based summaries
  const statesWithDLIs = new Set(allDLIs.map((d) => d.userState));
  const statesWithCompleted = new Set(completedDLIs.map((d) => d.userState));
  const statesWithInProgress = new Set(allDLIs.filter(d => d.status === "in_progress").map(d => d.userState));
  const statesWithNoDLIs = nigeriaStates.filter((state) => !statesWithDLIs.has(state));
  const overallPercentage = ((statesWithCompleted.size / nigeriaStates.length) * 100).toFixed(1).replace('.', ',');


  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nation-wide DLIs</h1>

      {/* ✅ Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow flex flex-col">
          <p className="text-sm text-gray-500 mb-1">Total Completed DLIs</p>
          <p className="text-2xl font-bold text-green-600">{completedDLIs.length}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow flex flex-col">
          <p className="text-sm text-gray-500 mb-1">Nationwide Completion Rate</p>
          <p className="text-2xl font-bold text-blue-600">{overallPercentage}%</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow flex flex-col">
          <p className="text-sm text-gray-500 mb-1">Total Active DLIs</p>
          <p className="text-2xl font-bold text-purple-600">{activeDLIs.length}</p>
        </div>
      </div>

      {/* ✅ State DLI Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-1">States that Completed ≥ 1 DLI</p>
          <p className="text-xl font-bold text-green-700">{statesWithCompleted.size}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-1">States with Ongoing DLIs</p>
          <p className="text-xl font-bold text-yellow-600">{statesWithInProgress.size}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-1">States Without Any DLI</p>
          <p className="text-xl font-bold text-gray-500">{statesWithNoDLIs.length}</p>
        </div>
      </div>

      {/* ✅ Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger><SelectValue placeholder="Filter by State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All States">All States</SelectItem>
            {nigeriaStates.map((state) => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDLI} onValueChange={setSelectedDLI}>
          <SelectTrigger><SelectValue placeholder="Filter by DLI" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All DLIs">All DLIs</SelectItem>
            {dliTitles.map((title) => (
              <SelectItem key={title} value={title}>{title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger><SelectValue placeholder="Filter by Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search Reform Champion"
          value={reformChampionSearch}
          onChange={(e) => setReformChampionSearch(e.target.value)}
        />
      </div>

      {/* ✅ Table + Report */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          Showing {filtered.length} result{filtered.length !== 1 && "s"}
        </p>
        <Button onClick={() => setShowModal(true)} className="bg-green-600 text-white">
          📄 Generate Status Report
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm border bg-white">
        <Table className="min-w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>DLI Title</TableHead>
              <TableHead>Reform Champion</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((dli) => {
                const percentage = Math.round((dli.completedSteps / dli.totalSteps) * 100);
                return (
                  <TableRow key={dli._id}>
                    <TableCell>{dli.dliTitle}</TableCell>
                    <TableCell>{dli.startedBy}</TableCell>
                    <TableCell>{dli.userState}</TableCell>
                    <TableCell className={dli.status === "completed" ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}>
                      {dli.status === "completed" ? "✅ Completed" : "⏳ In Progress"}
                    </TableCell>
                    <TableCell className={percentage === 100 ? "text-green-600 font-semibold" : "text-yellow-600 font-semibold"}>
                      {percentage}%
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="text-sm"
                        onClick={() => window.location.href = `/president/saber/${dli._id}`}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  No DLI records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ✅ Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-600">
          Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{" "}
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} results
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* ✅ Report Generation Modal */}
      <GenerateReportModal
        open={showModal}
        onClose={() => setShowModal(false)}
        dliTitles={dliTitles}
        states={nigeriaStates}
        allDLIs={activeDLIs}
      />
    </div>
  );
}
