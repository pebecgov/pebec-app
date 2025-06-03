// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import CreateReportTemplate from "@/components/ReportTemplate";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "../ui/toaster";
import { FaFileExcel, FaFilePdf, FaPlusSquare } from "react-icons/fa";
import { DialogDescription } from "@radix-ui/react-dialog";
interface ReportTemplate {
  id: Id<"report_templates">;
  title: string;
  role: "admin" | "user" | "mda" | "staff" | "reform_champion" | "saber_agent" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president";
  createdBy: Id<"users">;
  description?: string;
  headers: {
    name: string;
    type: "text" | "number" | "textarea" | "dropdown" | "checkbox" | "date";
    options?: string[];
  }[];
}
export default function ReportTemplatesList() {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "mda" | "user" | "staff" | "reform_champion" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president" | "all">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | undefined>(undefined);
  const {
    toast
  } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<Id<"report_templates"> | null>(null);
  const reportTemplates = useQuery(api.internal_reports.getReportTemplates, selectedRole === "all" ? {} : {
    role: selectedRole
  }) || [];
  const deleteTemplate = useMutation(api.internal_reports.deleteReportTemplate);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const users = useQuery(api.users.getAllUsers, {});
  const getCreatorName = (userId: Id<"users">) => {
    const user = users?.find(u => u._id === userId);
    return user ? user.fullName : "Unknown User";
  };
  const formattedTemplates = reportTemplates.map(template => ({
    id: template._id,
    title: template.title,
    role: template.role,
    createdBy: template.createdBy as Id<"users">,
    description: template.description,
    headers: template.headers
  }));
  const filteredReports = formattedTemplates.filter(template => (selectedRole === "all" || template.role === selectedRole) && template.title.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (sortOrder === "newest") {
      return b.id.localeCompare(a.id);
    } else {
      return a.id.localeCompare(b.id);
    }
  });
  const confirmDelete = (id: Id<"report_templates">) => {
    setSelectedDeleteId(id);
    setDeleteConfirmOpen(true);
  };
  const handleDelete = async () => {
    if (!selectedDeleteId) return;
    try {
      await deleteTemplate({
        id: selectedDeleteId
      });
      toast({
        title: "Deleted Successfully!",
        description: "Your Template was deleted successfully",
        variant: "default"
      });
    } catch {
      toast({
        title: "Error!",
        description: "Error deleting your template. Try again! ",
        variant: "destructive"
      });
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedDeleteId(null);
    }
  };
  const exportToPDF = (template: ReportTemplate) => {
    const doc = new jsPDF();
    doc.text(template.title, 20, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Column Name", "Type"]],
      body: template.headers.map(header => [header.name, header.type])
    });
    doc.save(`${template.title}.pdf`);
  };
  const exportToExcel = (template: ReportTemplate) => {
    const worksheet = XLSX.utils.json_to_sheet(template.headers.map(header => ({
      "Column Name": header.name,
      Type: header.type
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Headers");
    XLSX.writeFile(workbook, `${template.title}.xlsx`);
  };
  return <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-end mb-4">
  <Dialog>
    <DialogTrigger asChild>
      <Button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        📢 BFA Report Information
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md p-6">
      <DialogTitle>How to create BFA Report Template</DialogTitle>
      <p className="text-gray-700 mt-4">
        When creating <strong>BFA Report</strong> for <strong>MDA - Reform Champion</strong>, please make sure that the report title is spelled exactly like this: <strong>BFA Report</strong>. 
        <br /><br />
        This is because the PEBEC Staff that must receive this report will only get this BFA Report only and the system currntly filters out the name of the report as being stored "BFA Report".
      </p>
    </DialogContent>
  </Dialog>
    </div>
      {}
      <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md">
        <div className="w-full md:w-1/2">
          <Input placeholder="🔍 Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-2 pl-10 text-gray-900 rounded-lg border border-gray-300 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400" />
        </div>
        <div className="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3">
          <Select onValueChange={val => setSelectedRole(val as any)} value={selectedRole}>
            <SelectTrigger className="p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="mda">MDA</SelectItem>
              <SelectItem value="reform_champion">MDA - Reform Champion</SelectItem>
              <SelectItem value="deputies">Sherrif</SelectItem>
              <SelectItem value="magistrates">Magistrates</SelectItem>



            </SelectContent>
          </Select>
          <Select onValueChange={val => setSortOrder(val as "newest" | "oldest")} value={sortOrder}>
  <SelectTrigger className="p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600">
    <SelectValue placeholder="Sort By" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="newest">Newest First</SelectItem>
    <SelectItem value="oldest">Oldest First</SelectItem>
  </SelectContent>
        </Select>

          <Button className="bg-green-600 text-white flex items-center px-4 py-2 rounded-lg hover:bg-green-700" onClick={() => {
          setEditingTemplate(undefined);
          setIsDialogOpen(true);
        }}>
           <FaPlusSquare /> Create New Template
          </Button>
        </div>
      </div>



      {}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Report Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length > 0 ? filteredReports.map(template => <tr key={template.id} className="border-b dark:border-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{template.title}</td>
                  <td className="px-4 py-3 text-sm font-medium">{template.role.toUpperCase()}</td>
                  <td className="px-4 py-3">{getCreatorName(template.createdBy)}</td>

                  <td className="px-4 py-3 flex items-center space-x-3">
                    <Button className="bg-yellow-500 text-white px-3 py-1 text-xs rounded-lg" onClick={() => {
                setEditingTemplate(template);
                setIsDialogOpen(true);
              }}>
                      ✏ Edit
                    </Button>
                    <Button className="bg-red-500 text-white px-3 py-1 text-xs rounded-lg" onClick={() => confirmDelete(template.id)}>
                      🗑 Delete
                    </Button>
                    <Button className="bg-gray-600 text-white px-3 py-1 text-xs rounded-lg" onClick={() => exportToPDF(template)}>
                       <FaFilePdf></FaFilePdf>PDF
                    </Button>
                    <Button className="bg-green-600 text-white px-3 py-1 text-xs rounded-lg" onClick={() => exportToExcel(template)}>
                       <FaFileExcel /> Excel
                    </Button>
                  </td>
                </tr>) : <tr><td colSpan={4} className="px-4 py-3 text-center text-gray-500">No matching templates found.</td></tr>}
          </tbody>
        </table>
      </div>

      {}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>{editingTemplate ? "Edit Report Template" : "Create New Report Template"}</DialogTitle>
          <CreateReportTemplate existingTemplate={editingTemplate} onClose={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
 {}
 <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
          <DialogFooter>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 text-white" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>;
}