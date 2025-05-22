// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
export default function FillReportPage() {
  const {
    fillId
  } = useParams();
  const router = useRouter();
  const {
    user
  } = useUser();
  const [template, setTemplate] = useState<null | {
    _id: Id<"report_templates">;
    title: string;
    description?: string;
    headers: {
      name: string;
      type: "text" | "number" | "textarea" | "dropdown" | "checkbox";
      options?: string[];
    }[];
    role: "admin" | "user" | "mda" | "staff" | "reform_champion" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president" | (string & {});
    createdBy: Id<"users">;
  }>(null);
  const [formData, setFormData] = useState<string[][]>([]);
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");
  const convexUserId = convexUser?._id;
  const availableReports = useQuery(api.internal_reports.getAvailableReports, convexUser?.role ? {
    role: convexUser.role as "admin" | "user" | "mda" | "staff" | "deputies" | "magistrates" | "reform_champion" | "state_governor" | "president" | "vice_president" | "reform_champion"
  } : "skip") ?? [];
  useEffect(() => {
    if (fillId && availableReports.length > 0) {
      const foundTemplate = availableReports.find(t => t._id === fillId);
      if (foundTemplate) {
        setTemplate(foundTemplate);
        setFormData([foundTemplate.headers.map(() => "")]);
      } else {
        toast.error("Report template not found.");
        router.push("/mda/reports");
      }
    }
  }, [fillId, availableReports, router]);
  const submitReport = useMutation(api.internal_reports.submitInternalReport);
  const handleChange = (rowIndex: number, colIndex: number, value: string) => {
    setFormData(prev => {
      const updated = [...prev];
      updated[rowIndex][colIndex] = value;
      return updated;
    });
  };
  const addRow = () => {
    if (!template) return;
    setFormData([...formData, template.headers.map(() => "")]);
  };
  const handleSubmit = async () => {
    if (!convexUserId || !template) {
      toast.error("User not found in the database.");
      return;
    }
    try {
      await submitReport({
        templateId: template._id,
        submittedBy: convexUserId as Id<"users">,
        role: template.role as "admin" | "user" | "mda" | "staff" | "federal" | "reform_champion" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president",
        data: formData
      });
      toast.success("Report submitted successfully!");
      router.push("/mda/reports");
    } catch {
      toast.error("Failed to submit report.");
    }
  };
  if (!template) return <p className="text-center p-6 text-gray-500">Loading Report...</p>;
  return <div className="p-6 bg-white rounded-lg shadow-md overflow-x-auto">
      <h2 className="text-xl font-semibold">{template.title}</h2>
      <p className="text-gray-600 mb-4">{template.description}</p>

      {}
      <div className="overflow-x-auto">
        <Table className="mb-4 min-w-max">
          <TableHeader>
            <TableRow>
              {template.headers.map((header, index) => <TableHead key={index}>{header.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.map((row, rowIndex) => <TableRow key={rowIndex}>
                {row.map((cell, colIndex) => <TableCell key={colIndex}>
                 {template.headers[colIndex].type === "dropdown" ? <Select onValueChange={val => handleChange(rowIndex, colIndex, val)}>
                     <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                     <SelectContent>
                       {template.headers[colIndex].options?.map((option, i) => <SelectItem key={i} value={option}>{option}</SelectItem>)}
                     </SelectContent>
                   </Select> : template.headers[colIndex].type === "textarea" ? <Textarea value={cell} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} /> : template.headers[colIndex].type === "checkbox" ? <input type="checkbox" checked={cell === "true"} onChange={e => handleChange(rowIndex, colIndex, e.target.checked ? "true" : "false")} className="w-5 h-5 cursor-pointer" /> : <Input type={template.headers[colIndex].type === "number" ? "number" : "text"} value={cell} onChange={e => handleChange(rowIndex, colIndex, e.target.value)} />}
               </TableCell>)}
              </TableRow>)}
          </TableBody>
        </Table>
      </div>

      <Button onClick={addRow} className="mr-2">➕ Add Row</Button>
      <Button onClick={handleSubmit} className="bg-green-600 text-white">✅ Submit Report</Button>
    </div>;
}