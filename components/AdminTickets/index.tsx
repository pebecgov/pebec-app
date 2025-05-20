"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useUserRole } from "@/lib/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveAs } from "file-saver"; // Import file-saver
import { useUser } from "@clerk/nextjs";
import { ArrowDownIcon } from "@heroicons/react/24/solid"; // Import new download icon for export
import { PencilIcon, UserPlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Typography,
} from "@material-tailwind/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Pagination, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../ui/pagination";
import { Search } from "lucide-react";

import { DialogFooter } from "../ui/dialog";
import GenerateTicketReport from "../GenerateReports/GenerateTicketReport";
import GenerateMonthlyReport from "../GenerateReports/GenerateMonthlyTicketsReport";
import { Input } from "../ui/input";
import { Textarea } from "@headlessui/react";

const TABS = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { role, isLoading } = useUserRole();

  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [mdaFilter, setMdaFilter] = useState<string>(""); // Filter by MDA
  const mdaList = useQuery(api.users.getMDAs) || []; // Assuming you have a query to fetch MDAs
  const assignMDA = useMutation(api.tickets.assignTicketMDA); // ✅ Mutation to update ticket
  const [showTicketReportModal, setShowTicketReportModal] = useState(false);
const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);

const [showResolutionDialog, setShowResolutionDialog] = useState(false);
const [resolutionNote, setResolutionNote] = useState("");
const [pendingResolution, setPendingResolution] = useState<{
  ticketId: Id<"tickets">;
  status: "resolved" | "closed";
} | null>(null);


  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  }); // Date range filter
  const [selectedTickets, setSelectedTickets] = useState<Id<"tickets">[]>([]); // Store selected tickets
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    ticketId: Id<"tickets">;
    newStatus: string;
  } | null>(null);
  // ✅ State for Assigning MDA


  const rolePathPrefix = (() => {
    if (role === "admin") return "admin";
    if (role === "staff") return "staff";
    if (role === "president") return "president";
    if (role === "vice_president") return "vice_president";
    return "unknown";
  })();
  
  const [selectedTicket, setSelectedTicket] = useState<Id<"tickets"> | null>(null);
  const [selectedMDA, setSelectedMDA] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasTicketAccess = (role: string | undefined) =>
    role === "admin" || role === "staff" || role === "president" || role === "vice_president";
  

  const tickets = useQuery(api.tickets.getAllTickets, hasTicketAccess(role) ? {} : "skip");

  
  const updateTicketStatus = useMutation(api.tickets.updateTicketStatus);

 // 🚀 Redirect non-admin users
 useEffect(() => {
  if (!isLoading && !hasTicketAccess(role)) {
    router.replace("/");
  }
}, [role, isLoading, router]);

if (isLoading) {
  return <p>Loading...</p>; // ⏳ Prevent rendering until the role is determined
}



const handleAssignMDA = async () => {
  if (!selectedTicket || !selectedMDA) return;

  const mdaRecord = mdaList.find(mda => mda.name === selectedMDA);
  if (!mdaRecord) {
    toast.error("MDA not found");
    return;
  }

  try {
    await assignMDA({
      ticketId: selectedTicket as Id<"tickets">,
      mdaId: mdaRecord._id as Id<"mdas">
    });
    toast.success(`Ticket assigned to ${selectedMDA}`);
    setIsDialogOpen(false);
  } catch (error) {
    toast.error("Failed to assign MDA.");
  }
};

  // Filter tickets based on status, MDA, date range, and search query
  const filteredTickets = tickets
  ?.filter(ticket => {
    const ticketDate = new Date(ticket.createdAt);
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;

    
    return (
      (statusFilter === "all" || ticket.status === statusFilter) &&
      (!mdaFilter || ticket.assignedMDAName === mdaFilter) && // ✅ Match with selected MDA
      (!startDate || ticketDate >= startDate) &&
      (!endDate || ticketDate <= endDate) &&
      (ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.status.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }) || [];


  // Pagination state
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export selected tickets to Excel
  const exportToExcel = () => {
    const data = filteredTickets.filter(ticket =>
      selectedTickets.includes(ticket._id)
    );
    const csvData = data.map(ticket => ({
      TicketNumber: ticket.ticketNumber,
      Title: ticket.title,
      Status: ticket.status,
      MDA: ticket.assignedMDA,
      Date: new Date(ticket.createdAt).toLocaleDateString(),
    }));

    const csvContent = [
      ["Report Number", "Title", "Status", "MDA", "Date"],
      ...csvData.map(item => [item.TicketNumber, item.Title, item.Status, item.MDA, item.Date]),
    ]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "tickets.csv");
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800 border-green-400";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-400";
      case "open":
        return "bg-orange-100 text-orange-800 border-orange-400";
      case "closed":
        return "bg-red-100 text-red-800 border-red-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-400";
    }
  };
  

  // Handle status change function
  async function handleStatusChange(ticketId: string, newStatus: string) {
    try {
      await updateTicketStatus({
        ticketId: ticketId as Id<"tickets">,
        status: newStatus as "open" | "in_progress" | "resolved" | "closed",
      });
      toast.success("Ticket status updated.");
    } catch (error) {
      toast.error("Failed to update ticket.");
      console.error(error);
    }
  }

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMdaFilter("");
    setDateRange({ start: "", end: "" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
      <h1 className="text-xl font-bold mb-4">Filter Tickets</h1>

      <div className="bg-zinc-800 text-white p-4 rounded-xl shadow-md mb-6">
  <div className="flex flex-col sm:flex-row sm:items-end sm:flex-wrap gap-4">

    {/* Search Field */}
    <div className="flex-1 min-w-[250px] sm:max-w-xs">
      <div className="relative h-12">
        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-3 py-2 w-full h-full bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search..."
        />
      </div>
    </div>

    {/* Status Filter */}
    <div className="w-full sm:w-44 h-12">
      <Select onValueChange={(value) => setStatusFilter(value as any)}>
        <SelectTrigger className="w-full h-full bg-zinc-700 text-white border-zinc-600">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 text-white">
          {TABS.map((tab) => (
            <SelectItem key={tab.value} value={tab.value}>
              {tab.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* MDA Filter */}
    <div className="w-full sm:w-44 h-12">
      <Select onValueChange={(value) => setMdaFilter(value === "all" ? "" : value)}>
        <SelectTrigger className="w-full h-full bg-zinc-700 text-white border-zinc-600">
          <SelectValue placeholder="Filter by MDA" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 text-white">
          <SelectItem value="all">All MDAs</SelectItem>
          {mdaList
  .filter((mda) => mda.name && mda.name.trim() !== "")
  .map((mda) => (
    <SelectItem key={mda._id} value={mda.name}>
      {mda.name}
    </SelectItem>
))}

        </SelectContent>
      </Select>
    </div>

    {/* Dates with Labels */}
    <div className="flex flex-col sm:flex-row gap-4">
  {/* Start Date Picker */}
  <div className="flex flex-col w-full sm:w-40">
    <label className="text-xs text-zinc-300 mb-1">From</label>
    <Input
      type="date"
      value={dateRange.start}
      onChange={(e) => {
        const newStart = e.target.value;
        setDateRange((prev) => ({
          ...prev,
          start: newStart,
          end: prev.end && prev.end < newStart ? "" : prev.end, // ✅ Reset end if it's before start
        }));
      }}
      className="bg-zinc-700 text-white border border-zinc-600 h-12"
    />
  </div>

  {/* End Date Picker */}
  <div className="flex flex-col w-full sm:w-40">
    <label className="text-xs text-zinc-300 mb-1">To</label>
    <Input
      type="date"
      value={dateRange.end}
      min={dateRange.start || undefined}  // ✅ Make sure cannot pick before start
      onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
      className="bg-zinc-700 text-white border border-zinc-600 h-12"
    />
  </div>
</div>


    {/* Buttons Group */}
    <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
      <Button
        onClick={resetFilters}
        variant="outline"
        className="bg-white text-black hover:bg-zinc-100 h-12"
      >
        ♻️ Reset
      </Button>

      <Button
        className="bg-green-600 text-white hover:bg-green-700 h-12"
        onClick={() => setShowTicketReportModal(true)}
      >
        📄 Generate Report
      </Button>

      <Button
        className="bg-blue-600 text-white hover:bg-blue-700 h-12"
        onClick={() => setShowMonthlyReportModal(true)}
      >
        📅 Monthly Report
      </Button>
    </div>
  </div>
</div>




      {/* Button Layout: Export on Left and Reset on Right */}
      <div className={`w-full sm:w-64 flex items-center justify-between ${
  selectedTickets.length === 0 ? "opacity-50 cursor-not-allowed" : ""
}`}
>
        {/* Export Button */}
        <Button
  onClick={exportToExcel}
  className="w-full sm:w-64 flex items-center justify-between"
  disabled={selectedTickets.length === 0} // ⛔ Disable when no tickets selected
>
  <ArrowDownIcon className="w-5 h-5 mr-2" />
  Export Selected Reports
</Button>


        {/* Reset Button */}
        
      </div>

      {/* Ticket Table */}
      <div className="overflow-auto max-w-full mt-6 rounded-lg border border-gray-200">
      <Table className="min-w-[1100px]">
    <TableHeader>
      <TableRow>
        <TableHead className="w-10">
          <input
            type="checkbox"
            onChange={(e) => {
              setSelectedTickets(e.target.checked ? filteredTickets.map(ticket => ticket._id) : []);
            }}
          />
        </TableHead>
        <TableHead  className="min-w-[150px]">Report Number</TableHead>
        <TableHead  className="min-w-[150px]">Title</TableHead>
        <TableHead  className="min-w-[150px]">MDA</TableHead>
        <TableHead  className="min-w-[150px]">Assign</TableHead>
        <TableHead  className="min-w-[150px]" >Status</TableHead>
        <TableHead  className="min-w-[150px]" >Submission Date</TableHead>
        <TableHead  className="min-w-[150px]">Actions</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {paginatedTickets.map(ticket => (
        <TableRow key={ticket._id}>
          <TableCell>
            <input
              type="checkbox"
              checked={selectedTickets.includes(ticket._id)}
              onChange={(e) => {
                const updated = e.target.checked
                  ? [...selectedTickets, ticket._id]
                  : selectedTickets.filter(id => id !== ticket._id);
                setSelectedTickets(updated);
              }}
              
            />
          </TableCell>

          <TableCell className="whitespace-nowrap text-sm font-medium">
            {ticket.ticketNumber}
          </TableCell>

          <TableCell className="whitespace-normal break-words max-w-[200px] text-sm">
            {ticket.title}
          </TableCell>

          <TableCell className="whitespace-normal break-words max-w-[250px] text-sm">
            {ticket.assignedMDAName}
          </TableCell>

          <TableCell>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTicket(ticket._id);
                    setIsDialogOpen(true);
                  }}
                >
                  Assign MDA
                </Button>
              </DialogTrigger>
            </Dialog>
          </TableCell>

          <TableCell>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace("_", " ")}
            </span>
          </TableCell>

          <TableCell className="whitespace-nowrap text-sm">
            {new Date(ticket.createdAt ?? ticket._creationTime).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </TableCell>

          <TableCell>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-32">Change Status</Button>
                </PopoverTrigger>
                <PopoverContent className="w-40">
                  <div className="flex flex-col gap-2">
                    {["open", "in_progress", "resolved", "closed"].map((status) => (
                      <Button
                        key={status}
                        variant={ticket.status === status ? "default" : "outline"}
                        onClick={() => {
                          if (ticket.status === "resolved" && status !== "resolved") {
                            setPendingStatusChange({
                              ticketId: ticket._id,
                              newStatus: status,
                            });
                            setShowConfirmDialog(true);
                          } else {
                            if (["resolved", "closed"].includes(status)) {
                              setPendingResolution({
                                ticketId: ticket._id,
                                status: status as "resolved" | "closed",
                              });
                              setShowResolutionDialog(true);
                            } else {
                              handleStatusChange(ticket._id, status);
                            }
                                                      }
                        }}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Link href={`/${rolePathPrefix}/tickets/${ticket._id}`}>
  <Button variant="outline" size="sm">View</Button>
</Link>

            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>



      

      {/* Pagination */}
      <div className="mt-6 flex justify-center">
        <Pagination>
          <PaginationPrevious
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="cursor-pointer"
          />
          {Array.from({ length: totalPages }, (_, index) => (
            <PaginationItem key={index}>
              <PaginationLink
                isActive={currentPage === index + 1}
                onClick={() => setCurrentPage(index + 1)}
                className="cursor-pointer"
              >
                {index + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationNext
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="cursor-pointer"
          />
        </Pagination>


   
      </div>


      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {pendingResolution?.status === "resolved" ? "Add Resolution Note" : "Add Closing Note"}
      </DialogTitle>
    </DialogHeader>
    <Textarea
      placeholder="Enter your note..."
      value={resolutionNote}
      onChange={(e) => setResolutionNote(e.target.value)}
    />
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowResolutionDialog(false)}>
        Cancel
      </Button>
      <Button
        onClick={async () => {
          if (!resolutionNote.trim() || !pendingResolution) {
            toast.error("Resolution note is required.");
            return;
          }
          try {
            await updateTicketStatus({
              ticketId: pendingResolution.ticketId,
              status: pendingResolution.status,
              resolutionNote,
            });
            toast.success("Ticket updated successfully.");
            setShowResolutionDialog(false);
            setPendingResolution(null);
            setResolutionNote("");
          } catch (error) {
            toast.error("Failed to update ticket.");
            console.error(error);
          }
        }}
      >
        Submit
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

        {/* ✅ Assign MDA Dialog (Now Outside Table) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogTitle>Assign MDA</DialogTitle>
          <DialogDescription>
            Please select an MDA to assign this report.
          </DialogDescription>
          <Select onValueChange={(value) => setSelectedMDA(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an MDA" />
            </SelectTrigger>
            <SelectContent>
            {mdaList
  .filter((mda) => mda.name && mda.name.trim() !== "")
  .map((mda) => (
    <SelectItem key={mda._id} value={mda.name}>
      {mda.name}
    </SelectItem>
))}

            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignMDA} disabled={!selectedMDA}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This ticket has already been resolved by the assigned MDA.
        <br />
        Are you sure you want to change the status?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="mt-4">
      <Button
        variant="outline"
        onClick={() => {
          setShowConfirmDialog(false);
          setPendingStatusChange(null);
        }}
      >
        No
      </Button>
      <Button
        onClick={() => {
          if (pendingStatusChange) {
            handleStatusChange(
              pendingStatusChange.ticketId,
              pendingStatusChange.newStatus
            );
            setShowConfirmDialog(false);
            setPendingStatusChange(null);
          }
        }}
      >
        Yes, change it
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


      {showTicketReportModal && (
  <GenerateTicketReport
    open={showTicketReportModal}
    onClose={() => setShowTicketReportModal(false)}
  />
)}

{showMonthlyReportModal && (
  <GenerateMonthlyReport
    open={showMonthlyReportModal}
    onClose={() => setShowMonthlyReportModal(false)}
  />
)}

    </div>

    
  );
}
