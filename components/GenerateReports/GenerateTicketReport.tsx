// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { api } from "@/convex/_generated/api";
import { useQuery, useConvex } from "convex/react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
const statuses = ["open", "in_progress", "resolved", "closed", "all"];
type Props = {
  open: boolean;
  onClose: () => void;
};
type TicketUser = {
  _id: Id<"users">;
  firstName: string;
  lastName: string;
  email: string;
  businessName?: string;
};
export default function GenerateTicketReport({
  open,
  onClose
}: Props) {
  const convex = useConvex();
  const users = useQuery(api.tickets.getAllTicketUsers) as TicketUser[] | undefined;
  const [openUserDropdown, setOpenUserDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [step, setStep] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | "all">("all");
  const [status, setStatus] = useState<string | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<"user" | "business" | "mda" | null>(null);
  const [selectedMDA, setSelectedMDA] = useState<string | "all">("all");
  const {
    user
  } = useUser();
  const mdas = useQuery(api.tickets.getAllMdas);
  const userRole = user?.publicMetadata?.role as string;
  const privilegedRoles = ["admin", "staff", "president", "vice_president"];
  const showMdaColumn = ["admin", "staff", "president", "vice_president"].includes(userRole);
  const showMdaFilter = user && privilegedRoles.includes(user.publicMetadata?.role as string);
  const mdaMap = useMemo(() => {
    if (!mdas) return {};
    return mdas.reduce((map, mda) => {
      map[mda._id] = mda.name;
      return map;
    }, {} as Record<string, string>);
  }, [mdas]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | "all">("all");
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => (u.firstName + " " + u.lastName).toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);
  const handleFilter = async () => {
    setIsGenerating(true);
    const result = await convex.query(api.tickets.getFilteredTickets, {
      userId: filterMode === "user" && selectedUser !== "all" ? selectedUser as Id<"users"> : undefined,
      businessName: filterMode === "business" && selectedBusiness !== "all" ? selectedBusiness.toLowerCase() : undefined,
      mdaName: filterMode === "mda" && selectedMDA !== "all" ? selectedMDA : undefined,
      status: status !== "all" ? status : undefined,
      fromDate: startDate ? new Date(startDate).getTime() : undefined,
      toDate: endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)).getTime() : undefined
    });
    const enhancedResult = result.map(ticket => ({
      ...ticket,
      assignedMDAName: ticket.assignedMDA ? mdaMap[ticket.assignedMDA] || "Unassigned" : "Unassigned"
    }));
    setFilteredData(enhancedResult);
    setIsGenerated(true);
    setIsGenerating(false);
  };
  const businessNames = useQuery(api.tickets.getAllBusinessNames) ?? [];
  const filterHeader = useMemo(() => {
    if (filterMode === "user" && selectedUser !== "all") {
      const user = users?.find(u => u._id === selectedUser);
      return `Filtered by User: ${user?.firstName || ""} ${user?.lastName || ""}`;
    }
    if (filterMode === "business" && selectedBusiness !== "all") {
      return `Filtered by Business: ${selectedBusiness}`;
    }
    return "All Submissions";
  }, [filterMode, selectedUser, selectedBusiness, users]);
  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape"
    });
    doc.setFontSize(18);
    doc.text("Ticket Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), "PPPpp")}`, 14, 28);
    doc.text(filterHeader, 14, 35);
    const tableData = filteredData.map(t => {
      const row = [t.ticketNumber || "—", t.fullName || "—", t.businessName || "—", t.title || "—"];
      if (showMdaColumn) {
        row.push(t.assignedMDAName || "Unassigned");
      }
      row.push(t.status, format(new Date(t._creationTime), "PPP"), t.state || "—", t.address || "—", t.email || "—", t.phoneNumber || "—", t.description?.replace(/<[^>]+>/g, "") || "", t.resolutionNote || "");
      return row;
    });
    const pdfHead = ["Ticket #", "Name", "Business Name", "Title", ...(showMdaColumn ? ["MDA Name"] : []), "Status", "Submission Date", "State", "Address", "Email", "Phone", "Description", "Resolution Note"];
    autoTable(doc, {
      startY: 40,
      head: [pdfHead],
      body: tableData,
      styles: {
        fontSize: 6
      },
      theme: "grid"
    });
    doc.save("ticket_report.pdf");
  };
  const downloadExcel = () => {
    const dataRows = filteredData.map(t => {
      const base = {
        TicketNumber: t.ticketNumber || "—",
        Name: t.fullName || "—",
        BusinessName: t.businessName || "—",
        Title: t.title || "—",
        Status: t.status,
        SubmissionDate: format(new Date(t._creationTime), "PPP"),
        State: t.state || "—",
        Address: t.address || "—",
        Email: t.email || "—",
        Phone: t.phoneNumber || "—",
        Description: t.description?.replace(/<[^>]+>/g, "") || "",
        ResolutionNote: t.resolutionNote || ""
      };
      if (showMdaColumn) {
        return {
          ...base,
          MDA: t.assignedMDAName || "Unassigned"
        };
      }
      return base;
    });
    const columnHeaders = ["TicketNumber", "Name", "BusinessName", "Title", ...(showMdaColumn ? ["MDA"] : []), "Status", "SubmissionDate", "State", "Address", "Email", "Phone", "Description", "ResolutionNote"];
    const worksheet = XLSX.utils.json_to_sheet([{
      A: filterHeader
    }, {}, ...dataRows], {
      skipHeader: true
    });
    XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], {
      origin: "A3"
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ticket Report");
    XLSX.writeFile(workbook, "ticket_report.xlsx");
  };
  const isNextDisabled = step === 1 && !filterMode || step === 2 && !(filterMode === "user" && selectedUser || filterMode === "business" && selectedBusiness || filterMode === "mda" && selectedMDA) || step === 3 && (!startDate || !endDate);
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate Ticket Report</DialogTitle>
        </DialogHeader>

        {step === 1 && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div onClick={() => {
          setFilterMode("user");
          setStep(2);
        }} className={`cursor-pointer border p-4 rounded-lg text-center shadow-sm hover:shadow-md transition ${filterMode === "user" ? "ring-2 ring-blue-500" : ""}`}>
      <h2 className="text-lg font-medium">Filter by User</h2>
      <p className="text-sm text-muted-foreground mt-1">Search by specific user</p>
    </div>

    <div onClick={() => {
          setFilterMode("business");
          setStep(2);
        }} className={`cursor-pointer border p-4 rounded-lg text-center shadow-sm hover:shadow-md transition ${filterMode === "business" ? "ring-2 ring-blue-500" : ""}`}>
      <h2 className="text-lg font-medium">Filter by Business</h2>
      <p className="text-sm text-muted-foreground mt-1">Search by business name</p>
    </div>

        {showMdaFilter && mdas && <div onClick={() => {
          setFilterMode("mda");
          setStep(2);
        }} className={`cursor-pointer border p-4 rounded-lg text-center shadow-sm hover:shadow-md transition ${filterMode === "mda" ? "ring-2 ring-blue-500" : ""}`}>
    <h2 className="text-lg font-medium">Filter by MDA</h2>
    <p className="text-sm text-muted-foreground mt-1">Search by MDA name</p>
  </div>}

  </div>}


      {step === 2 && filterMode === "mda" && <div className="space-y-4">
    <label className="text-sm font-medium">Select MDA</label>
    <Popover open={openUserDropdown} onOpenChange={setOpenUserDropdown}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedMDA === "all" ? "All MDAs" : selectedMDA}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Search MDA..." className="mb-2" />
          <CommandList>
          <CommandItem onSelect={() => {
                  setSelectedMDA("all");
                  setOpenUserDropdown(false);
                }}>
  All MDAs
                </CommandItem>
            {mdas?.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).map(mda => <CommandItem key={mda._id} onSelect={() => {
                  setSelectedMDA(mda.name);
                  setOpenUserDropdown(false);
                }}>
                  {mda.name}
                </CommandItem>)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>}


      {step === 2 && filterMode === "business" && <div className="space-y-4">
    <label className="text-sm font-medium">Select Business</label>
    <Popover open={openUserDropdown} onOpenChange={setOpenUserDropdown}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedBusiness === "all" ? "All Businesses" : selectedBusiness || "Choose business"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Search business..." className="mb-2" />
          <CommandList>
          <CommandItem onSelect={() => {
                  setSelectedBusiness("all");
                  setOpenUserDropdown(false);
                }}>
  All Businesses
                </CommandItem>
            {businessNames.filter((name): name is string => typeof name === "string").filter(name => name.toLowerCase().includes(search.toLowerCase())).map(name => <CommandItem key={name} onSelect={() => {
                  setSelectedBusiness(name);
                  setOpenUserDropdown(false);
                }}>
      {name}
    </CommandItem>)}

          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>}



      {step === 2 && filterMode === "user" && <div className="space-y-4">
    <label className="text-sm font-medium">Select User</label>
    <Popover open={openUserDropdown} onOpenChange={setOpenUserDropdown}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedUser === "all" ? "All Users" : users?.find(u => u._id === selectedUser)?.firstName + " " + users?.find(u => u._id === selectedUser)?.lastName || "Choose a user"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Search user..." className="mb-2" />
          <CommandList>
          <CommandItem key="all-users" onSelect={() => setSelectedUser("all")}>
  All Users
                </CommandItem>
            {search && filteredUsers.length === 0 && <CommandEmpty>No users found.</CommandEmpty>}
           {filteredUsers.map(user => <CommandItem key={user._id} onSelect={() => {
                  setSelectedUser(user._id);
                  setOpenUserDropdown(false);
                }}>
    {user.firstName} {user.lastName} - {user.email}
  </CommandItem>)}

          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>}

        {step === 3 && <div className="space-y-4">
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <label className="text-sm font-medium">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>}

        <DialogFooter className="mt-6 justify-between">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 3 && <Button disabled={isNextDisabled} className={isNextDisabled ? "opacity-50 cursor-not-allowed" : ""} onClick={() => setStep(step + 1)}>
    Next
  </Button>}
          {step === 3 && !isGenerated && <Button disabled={isGenerating || !startDate || !endDate} onClick={handleFilter}>
           {isGenerating ? "Generating..." : "Generate Report"}
         </Button>}
          {step === 3 && isGenerated && <div className="flex gap-2">
              <Button onClick={downloadPDF}>Download PDF</Button>
              <Button onClick={downloadExcel}>Download Excel</Button>
            </div>}
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}