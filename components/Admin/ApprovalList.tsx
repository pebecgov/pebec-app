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

  // Helper function to check if a count matches a filter range
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
    const matchesMda = !rolesRequiringMda.includes(roleFilter) || selectedMda === "all" || user.roleRequest?.mdaName === selectedMda;
    const matchesState = !rolesRequiringState.includes(roleFilter) || selectedState === "all" || user.roleRequest?.state === selectedState;
    
    // MDA-based filtering using dropdown ranges
    let matchesMdaFilters = true;
    if (user.roleRequest?.mdaName) {
      const mdaStats = mdaStatsMap[user.roleRequest.mdaName];
      
      if (mdaStats) {
        // MDA has statistics
        const matchesAgentFilter = matchesRange(mdaStats.reportGovAgents, reportGovAgentsFilter);
        const matchesChampionFilter = matchesRange(mdaStats.reformChampions, reformChampionsFilter);
        matchesMdaFilters = matchesAgentFilter && matchesChampionFilter;
      } else {
        // MDA has no statistics (0 agents, 0 champions)
        const matchesAgentFilter = matchesRange(0, reportGovAgentsFilter);
        const matchesChampionFilter = matchesRange(0, reformChampionsFilter);
        matchesMdaFilters = matchesAgentFilter && matchesChampionFilter;
      }
    } else if (reportGovAgentsFilter !== "all" || reformChampionsFilter !== "all") {
      // No MDA specified but filters are set, exclude
      matchesMdaFilters = false;
    }
    
    return matchesSearch && matchesRole && matchesMda && matchesState && matchesMdaFilters;
  });

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
  return <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Pending Internal Approvals</h2>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full md:w-1/2" />

        <Select value={roleFilter} onValueChange={val => {
        setRoleFilter(val);
        setSelectedMda("all");
        setSelectedState("all");
      }}>
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
      </div>

      {(roleFilter === "all" || rolesRequiringMda.includes(roleFilter)) && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Filter by ReportGov Agent/Champion Count</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">
                Report Gov Agents
              </label>
              <Select value={reportGovAgentsFilter} onValueChange={setReportGovAgentsFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select range for Report Gov Agents" />
                </SelectTrigger>
                <SelectContent>
                  {agentFilterOptions.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reform Champions Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">
                Reform Champions
              </label>
              <Select value={reformChampionsFilter} onValueChange={setReformChampionsFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select range for Reform Champions" />
                </SelectTrigger>
                <SelectContent>
                  {championFilterOptions.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Reset Filters Button */}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setReportGovAgentsFilter("all");
                setReformChampionsFilter("all");
              }}
            >
              Reset MDA Filters
            </Button>
          </div>
        </div>
      )}

      {/* Existing MDA and State filters */}
      <div className="flex gap-4 mb-6">
        {rolesRequiringMda.includes(roleFilter) && <Select value={selectedMda} onValueChange={setSelectedMda}>
            <SelectTrigger className="w-full md:w-1/3">
              <SelectValue placeholder="Select MDA" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-auto">
              <SelectItem value="all">All MDAs</SelectItem>
              {mdasList.map((mda, index) => <SelectItem key={index} value={`${mda.abbreviation} - ${mda.name}`}>
                  {mda.abbreviation} - {mda.name}
                </SelectItem>)}
            </SelectContent>
          </Select>}

        {rolesRequiringState.includes(roleFilter) && <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-full md:w-1/3">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-auto">
              <SelectItem value="all">All States</SelectItem>
              {allStates.map((state, index) => <SelectItem key={index} value={state}>{state}</SelectItem>)}
            </SelectContent>
          </Select>}
      </div>

      {filteredRequests.length === 0 ? <p>No pending requests.</p> : <div className="overflow-x-auto w-full">
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
              {filteredRequests.map(user => <TableRow key={user._id}>
                  <TableCell className="truncate">{user.firstName} {user.lastName}</TableCell>
                  <TableCell className="truncate">{user.email}</TableCell>
                  <TableCell className="capitalize truncate">{user.roleRequest?.requestedRole}</TableCell>
                  <TableCell className="truncate">{user.roleRequest?.jobTitle || "—"}</TableCell>
                  <TableCell className="truncate">
                    {user.roleRequest?.mdaName || "—"}
                    {/* Show MDA stats if available */}
                    {user.roleRequest?.mdaName && mdaStatsMap[user.roleRequest.mdaName] && (
                      <div className="text-xs text-gray-500 mt-1">
                        Agents: {mdaStatsMap[user.roleRequest.mdaName].reportGovAgents}, 
                        Champions: {mdaStatsMap[user.roleRequest.mdaName].reformChampions}
                      </div>
                    )}
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
                </TableRow>)}
            </TableBody>
          </Table>
        </div>}
    </div>;
}