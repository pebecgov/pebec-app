// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Id } from "@/convex/_generated/dataModel";
import { mdasList } from "../mdaList";
import { setRole } from "@/app/(site)/admin/users/action";
import Link from "next/link";
import * as XLSX from "xlsx";
import { FaFilterCircleXmark } from "react-icons/fa6";
import { formatRole } from "@/lib/formatters";

const rolesRequiringMda = ["mda", "reform_champion", "saber_agent", "deputies", "magistrates", "state_governor"];
const rolesRequiringState = ["reform_champion", "saber_agent", "deputies", "magistrates", "state_governor"];
const allStates = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];

// Filter options for agent/champion counts
const agentFilterOptions = [
  { value: "all", label: "All" },
  { value: "0", label: "No agents" },
  { value: "1-2", label: "1-2 agents" },
  { value: "2-4", label: "2-4 agents" },
  { value: "4-6", label: "4-6 agents" },
  { value: "6+", label: "6+ agents" }
];

const championFilterOptions = [
  { value: "all", label: "All" },
  { value: "0", label: "No champions" },
  { value: "1-2", label: "1-2 champions" },
  { value: "2-4", label: "2-4 champions" },
  { value: "4-6", label: "4-6 champions" },
  { value: "6+", label: "6+ champions" }
];

export default function InternalApprovals() {
  const pendingRequests = useQuery(api.users.getPendingRoleRequests) || [];
  const mdaStatistics = useQuery(api.users.getMDAStatistics) || [];
  const { toast } = useToast();
  const approveRequest = useMutation(api.users.approveRoleRequest);
  const rejectRequest = useMutation(api.users.rejectRoleRequest);
  
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedMda, setSelectedMda] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  
  // New dropdown filter states
  const [reportGovAgentsFilter, setReportGovAgentsFilter] = useState("all");
  const [reformChampionsFilter, setReformChampionsFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [mdaSearch, setMdaSearch] = useState("");

  // Create a map of MDA names to their statistics for quick lookup
  const mdaStatsMap = useMemo(() => {
    const map: Record<string, { reportGovAgents: number; reformChampions: number }> = {};
    mdaStatistics.forEach(stat => {
      map[stat.mdaName] = {
        reportGovAgents: stat.reportGovAgents,
        reformChampions: stat.reformChampions
      };
    });
    return map;
  }, [mdaStatistics]);


  const matchesRange = (count: number, filterValue: string): boolean => {
    if (filterValue === "all") return true;
    
    switch (filterValue) {
      case "0":
        return count === 0;
      case "1-2":
        return count >= 1 && count <= 2;
      case "2-4":
        return count >= 2 && count <= 4;
      case "4-6":
        return count >= 4 && count <= 6;
      case "6+":
        return count >= 6;
      default:
        return true;
    }
  };

  const filteredRequests = pendingRequests.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.roleRequest?.requestedRole === roleFilter;
    const matchesMda = selectedMda === "all" || getDisplayMdaName(user.roleRequest?.mdaName) === selectedMda;
    const matchesState = !rolesRequiringState.includes(roleFilter) || selectedState === "all" || user.roleRequest?.state === selectedState;
    
    
    let matchesMdaFilters = true;
    if (user.roleRequest?.mdaName) {
      const mdaStats = mdaStatsMap[user.roleRequest.mdaName];
      
      if (mdaStats) {
      
        const matchesAgentFilter = matchesRange(mdaStats.reportGovAgents, reportGovAgentsFilter);
        const matchesChampionFilter = matchesRange(mdaStats.reformChampions, reformChampionsFilter);
        matchesMdaFilters = matchesAgentFilter && matchesChampionFilter;
      } else {
        
        const matchesAgentFilter = matchesRange(0, reportGovAgentsFilter);
        const matchesChampionFilter = matchesRange(0, reformChampionsFilter);
        matchesMdaFilters = matchesAgentFilter && matchesChampionFilter;
      }
    } else if (reportGovAgentsFilter !== "all" || reformChampionsFilter !== "all") {
   
      matchesMdaFilters = false;
    }
    
    return matchesSearch && matchesRole && matchesMda && matchesState && matchesMdaFilters;
  });

  // Reset page on filter changes
  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val);
    setSelectedState("all");
    setCurrentPage(1);
  };
  const handleMdaFilterChange = (val: string) => {
    setSelectedMda(val);
    setCurrentPage(1);
  };
  const handleStateFilterChange = (val: string) => {
    setSelectedState(val);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleApprove = async (user: any) => {
    if (!user?.roleRequest?.requestedRole) return;
    let mdaName = user.roleRequest?.mdaName || "";
    if (user.roleRequest.requestedRole === "mda" && mdaName) {
      const foundMda = mdasList.find(mda => mda.name.toLowerCase() === mdaName.toLowerCase());
      if (foundMda) {
        mdaName = `${foundMda.abbreviation} - ${foundMda.name}`;
      }
    }
    try {
      await approveRequest({
        userId: user._id as Id<"users">,
        role: user.roleRequest.requestedRole,
        mdaName,
        phoneNumber: user.phoneNumber || "",
        state: user.roleRequest?.state || "",
        staffStream: user.roleRequest?.staffStream || ""
      });
      const formData = new FormData();
      formData.append("id", user.clerkUserId);
      formData.append("role", user.roleRequest.requestedRole);
      if (user.roleRequest?.staffStream) {
        formData.append("staffStream", user.roleRequest.staffStream);
      }
      await setRole(formData);
      toast({
        title: "Approved",
        description: "User has been approved successfully."
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to approve user.",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (user: any) => {
    try {
      await rejectRequest({
        userId: user._id as Id<"users">
      });
      toast({
        title: "Rejected",
        description: "User request has been rejected."
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to reject user.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadExcel = () => {
    // Prepare data for export
    const data = filteredRequests.map(user => ({
      "Name": `${user.firstName} ${user.lastName}`,
      "Email": user.email,
      "Requested Role": user.roleRequest?.requestedRole || "—",
      "Job Title": user.roleRequest?.jobTitle || "—",
      "MDA Name": user.roleRequest?.mdaName || "—",
      "State": user.roleRequest?.state || "—"
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Internal Approvals");

    // Download
    XLSX.writeFile(workbook, "internal-approvals.xlsx");
  };

  function getDisplayMdaName(mdaName) {
    if (!mdaName) return "—";
    const foundMda = mdasList.find(mda => mda.name.toLowerCase() === mdaName.toLowerCase());
    return foundMda ? `${foundMda.abbreviation} - ${foundMda.name}` : mdaName;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Pending Internal Approvals</h2>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <Input 
          placeholder="Search by name..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
          className="w-full md:w-1/2" 
        />

        <Select 
          value={roleFilter} 
          onValueChange={handleRoleFilterChange}
        >
          <SelectTrigger className="w-full md:w-1/4">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="mda">ReportGov Agent</SelectItem>
            <SelectItem value="reform_champion">MDA - Reform Champion</SelectItem>
            <SelectItem value="magistrates">Magistrates</SelectItem>
            <SelectItem value="deputies">Sherrif</SelectItem>
            <SelectItem value="saber_agent">SABER Agent</SelectItem>
            <SelectItem value="state_governor">State Governor</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedMda}
          onValueChange={handleMdaFilterChange}
        >
          <SelectTrigger className="w-full md:w-1/4">
            <SelectValue placeholder="Filter by MDA" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1">
              <Input
                placeholder="Search MDA..."
                value={mdaSearch}
                onChange={e => setMdaSearch(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                className="mb-2"
              />
            </div>
            <SelectItem value="all">All MDAs</SelectItem>
            {mdasList
              .filter(mda =>
                `${mda.abbreviation} - ${mda.name}`.toLowerCase().includes(mdaSearch.toLowerCase())
              )
              .map(mda => (
                <SelectItem key={mda.name} value={`${mda.abbreviation} - ${mda.name}`}>
                  {mda.abbreviation} - {mda.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="h-10 mt-2 md:mt-0 flex items-center gap-2"
          onClick={() => {
            setRoleFilter("all");
            setSelectedMda("all");
            setCurrentPage(1);
          }}
        >
          <FaFilterCircleXmark className="w-4 h-4" />
          Clear Filters
        </Button>
      </div>


      {filteredRequests.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[1000px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-40 truncate">Name</TableHead>
                <TableHead className="w-48 truncate">Email</TableHead>
                <TableHead className="w-40 truncate">Requested Role</TableHead>
                <TableHead className="w-48 truncate">Job Title</TableHead>
                <TableHead className="w-64 truncate">MDA Name</TableHead>
                <TableHead className="w-40 truncate">State</TableHead>
                <TableHead className="w-56 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequests.map(user => (
                <TableRow key={user._id}>
                  <TableCell className="truncate">{user.firstName} {user.lastName}</TableCell>
                  <TableCell className="truncate">{user.email}</TableCell>
                  <TableCell className="capitalize truncate">{formatRole(user.roleRequest?.requestedRole)}</TableCell>
                  <TableCell className="truncate">{user.roleRequest?.jobTitle || "—"}</TableCell>
                  <TableCell className="truncate">
                    {getDisplayMdaName(user.roleRequest?.mdaName)}
                    {/* Show MDA stats if available */}
                    {/* {user.roleRequest?.mdaName && mdaStatsMap[user.roleRequest.mdaName] && (
                      <div className="text-xs text-gray-500 mt-1">
                        Agents: {mdaStatsMap[user.roleRequest.mdaName].reportGovAgents}, 
                        Champions: {mdaStatsMap[user.roleRequest.mdaName].reformChampions}
                      </div>
                    )} */}
                  </TableCell>
                  <TableCell className="truncate">{user.roleRequest?.state || "—"}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button size="sm" onClick={() => handleApprove(user)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(user)}>Reject</Button>
                      <Link href={`/admin/users/internal-requests/${user._id}`}>
                        <Button size="sm" variant="secondary">View Request</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Pagination Controls */}
      {filteredRequests.length > 0 && (
        <>
        <div className="flex flex-col gap-2 mt-4">
        <div className="flex justify-center items-center mt-2 gap-4">
            <Button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
              Previous
            </Button>
            <span className="text-gray-600">Page {currentPage} of {totalPages}</span>
            <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
              Next
            </Button>
          </div>

        <div className="flex justify-center items-center text-sm text-gray-600">
            Total: {`${paginatedRequests.length}`}
          </div>
        </div>
         
         
        </>
      )}
    </div>
  );
}