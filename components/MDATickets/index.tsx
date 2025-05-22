// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../ui/pagination";
import { useUser } from "@clerk/nextjs";
import { useUserRole } from "@/lib/useUserRole";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Eye, Calendar } from "lucide-react";
import GenerateTicketReport from "@/components/GenerateReports/GenerateTicketReport";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import GenerateMonthlyReport from "../GenerateReports/GenerateMonthlyTicketsReport";
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
export default function MdaTicketsDashboard() {
  const router = useRouter();
  const {
    user,
    isLoaded
  } = useUser();
  const {
    role,
    isLoading
  } = useUserRole();
  const mdaUser = user ? useQuery(api.users.getUserDetails) : null;
  const mdaId = mdaUser?.mdaId || null;
  const [showTicketReportModal, setShowTicketReportModal] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const tickets = useQuery(api.tickets.getTicketsByMda, mdaId ? {
    mdaId
  } : "skip");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  useEffect(() => {
    if (!isLoading && role !== "mda") {
      router.replace("/");
    }
  }, [role, isLoading, router]);
  if (isLoading || !isLoaded) {
    return <p>Loading...</p>;
  }
  if (!mdaId) {
    return <p>No MDA assigned to your account.</p>;
  }
  const filteredTickets = tickets?.filter(ticket => {
    const ticketDate = new Date(ticket.createdAt);
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(new Date(dateRange.end).setHours(23, 59, 59, 999)) : null;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = ticket.title?.toLowerCase().includes(searchLower) || ticket.ticketNumber?.toLowerCase().includes(searchLower) || ticket.createdByUser?.firstName?.toLowerCase().includes(searchLower) || ticket.createdByUser?.lastName?.toLowerCase().includes(searchLower) || (ticket.createdByUser as any)?.businessName?.toLowerCase().includes(searchLower);
    return (statusFilter === "all" || ticket.status === statusFilter) && (!startDate || ticketDate >= startDate) && (!endDate || ticketDate <= endDate) && matchesSearch;
  }) || [];
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
      <h1 className="text-xl font-bold mb-4">Reports Dashboard</h1>
  
      {}
      <div className="flex flex-wrap items-start gap-4 mb-6 p-6 bg-white border rounded-lg shadow-lg">
  
        {}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input type="text" placeholder="Search by Ticket Number or Title" className="pl-10 p-3 border rounded-lg w-full h-[44px] focus:ring-2 focus:ring-blue-500 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
  
        {}
        <div className="relative min-w-[120px]">
          <select className="p-3 border rounded-lg w-full h-[44px] focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
  
        {}
        <div className="relative flex items-center gap-2 min-w-[180px]">
          <label className="text-gray-700 text-sm font-medium">From</label>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="date" className="pl-10 p-3 border rounded-lg w-full h-[44px] focus:ring-2 focus:ring-blue-500" value={dateRange.start} max={dateRange.end || undefined} onChange={e => {
            const newStart = e.target.value;
            const isInvalid = dateRange.end && newStart > dateRange.end;
            setDateRange({
              start: newStart,
              end: isInvalid ? "" : dateRange.end
            });
          }} />

          </div>
        </div>
  
        {}
        <div className="relative flex items-center gap-2 min-w-[180px]">
          <label className="text-gray-700 text-sm font-medium">To</label>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="date" className="pl-10 p-3 border rounded-lg w-full h-[44px] focus:ring-2 focus:ring-blue-500" value={dateRange.end} min={dateRange.start || undefined} onChange={e => {
            const newEnd = e.target.value;
            const isInvalid = dateRange.start && newEnd < dateRange.start;
            setDateRange({
              start: dateRange.start,
              end: isInvalid ? "" : newEnd
            });
          }} />

          </div>
        </div>
  
        {}
        <div className="flex flex-col sm:flex-row gap-4">
  <Card className="w-full sm:w-[250px] border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Custom Report</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <p className="text-sm text-muted-foreground leading-snug">
        Generate filtered report based on users, date or status.
      </p>
      <Button size="sm" className="w-full bg-green-600 text-white" onClick={() => setShowTicketReportModal(true)}>
        Get Started
      </Button>
    </CardContent>
  </Card>

  <Card className="w-full sm:w-[250px] border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Monthly Report</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <p className="text-sm text-muted-foreground leading-snug">
        Auto-generate this month's report from the 1st to today.
      </p>
      <Button size="sm" className="w-full bg-green-600 text-white" onClick={() => setShowMonthlyReportModal(true)}>
        Generate Report
      </Button>
    </CardContent>
  </Card>
      </div>

      </div>
  
      {}
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Ticket Number</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted Date</TableHead>
            <TableHead>View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTickets.length > 0 ? paginatedTickets.map((ticket, index) => <TableRow key={ticket._id}>
                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={ticket.createdByUser.imageUrl || ""} alt="User Image" />
                    <AvatarFallback>{ticket.createdByUser.firstName?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <span>{ticket.createdByUser.firstName} {ticket.createdByUser.lastName}</span>
                </TableCell>
                <TableCell>{ticket.ticketNumber}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>
  <Badge className={ticket.status === "resolved" ? "bg-green-100 text-green-800" : ticket.status === "in_progress" ? "bg-yellow-100 text-yellow-800" : ticket.status === "closed" ? "bg-red-100 text-red-800" : ticket.status === "open" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}>
    {ticket.status.replace("_", " ").toUpperCase()}
  </Badge>
          </TableCell>
                <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Link href={`/mda/tickets/${ticket._id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>) : <TableRow>
              <TableCell colSpan={7} className="text-center">No tickets found.</TableCell>
            </TableRow>}
        </TableBody>
      </Table>
  
      {}
      <div className="mt-6 flex justify-center">
        <Pagination>
          <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} />
          {Array.from({
          length: totalPages
        }, (_, index) => <PaginationItem key={index}>
              <PaginationLink isActive={currentPage === index + 1} onClick={() => setCurrentPage(index + 1)}>
                {index + 1}
              </PaginationLink>
            </PaginationItem>)}
          <PaginationNext onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} />
        </Pagination>
      </div>
  
      {}
      {showTicketReportModal && <GenerateTicketReport open={showTicketReportModal} onClose={() => setShowTicketReportModal(false)} />}
      
      {showMonthlyReportModal && <GenerateMonthlyReport open={showMonthlyReportModal} onClose={() => setShowMonthlyReportModal(false)} />}
    </div>;
}