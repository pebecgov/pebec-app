// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Trash } from "lucide-react";
type HeaderField = {
  name: string;
  type: "text" | "number" | "textarea" | "dropdown" | "checkbox" | "date";
  options?: string[];
};
interface CreateReportTemplateProps {
  existingTemplate?: {
    id: Id<"report_templates">;
    title: string;
    role: "admin" | "user" | "mda" | "staff" | "reform_champion" | "saber_agent" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president";
    createdBy: Id<"users">;
    description?: string;
    headers: HeaderField[];
  };
  onClose: () => void;
}
export default function CreateReportTemplate({
  existingTemplate,
  onClose
}: CreateReportTemplateProps) {
  const {
    user
  } = useUser();
  const clerkUserId = user?.id ?? "";
  const convexUser = useQuery(api.users.getUserByClerkId, clerkUserId ? {
    clerkUserId
  } : "skip");
  const convexUserId = convexUser?._id as Id<"users"> | undefined;
  const [title, setTitle] = useState(existingTemplate?.title || "");
  const [description, setDescription] = useState(existingTemplate?.description || "");
  const [role, setRole] = useState(existingTemplate?.role || "mda");
  const [headers, setHeaders] = useState<HeaderField[]>(existingTemplate?.headers || []);
  const [newHeader, setNewHeader] = useState("");
  const [headerType, setHeaderType] = useState<HeaderField["type"]>("text");
  const [dropdownOptions, setDropdownOptions] = useState("");
  const createTemplate = useMutation(api.internal_reports.createReportTemplate);
  const updateTemplate = useMutation(api.internal_reports.updateReportTemplate);
  const handleAddHeader = () => {
    if (!newHeader.trim()) {
      toast.error("Column name cannot be empty!");
      return;
    }
    setHeaders([...headers, {
      name: newHeader.trim(),
      type: headerType,
      options: headerType === "dropdown" ? dropdownOptions.split(",") : undefined
    }]);
    setNewHeader("");
    setDropdownOptions("");
  };
  const handleUpdateHeader = (index: number, updatedField: Partial<HeaderField>) => {
    setHeaders(prevHeaders => prevHeaders.map((header, i) => i === index ? {
      ...header,
      ...updatedField
    } : header));
  };
  const handleDeleteHeader = (index: number) => {
    setHeaders(prevHeaders => prevHeaders.filter((_, i) => i !== index));
  };
  const handleSubmit = async () => {
    if (!convexUserId) {
      toast.error("User data not loaded.");
      return;
    }
    if (!title || headers.length === 0) {
      toast.error("Please fill all fields.");
      return;
    }
    try {
      if (existingTemplate) {
        await updateTemplate({
          id: existingTemplate.id,
          title,
          description,
          role,
          headers
        });
        toast.success("Template updated successfully!");
      } else {
        await createTemplate({
          title,
          description,
          role,
          headers,
          createdBy: convexUserId
        });
        toast.success("Report template created successfully!");
      }
      onClose();
    } catch {
      toast.error("Failed to save template.");
    }
  };
  return <div className="p-4 max-h-[500px] overflow-y-auto">
      <h2 className="text-lg font-semibold">{existingTemplate ? "Edit Report Template" : "Create Report Template"}</h2>

      <Input placeholder="Report Title" value={title} onChange={e => setTitle(e.target.value)} className="mb-2" />
      <Textarea placeholder="Description (Optional)" value={description} onChange={e => setDescription(e.target.value)} className="mb-2" />

      <Select onValueChange={val => setRole(val as any)} value={role}>
        <SelectTrigger>
          <SelectValue placeholder="Select Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mda">MDA</SelectItem>
          <SelectItem value="reform_champion">MDA - Reform Champion </SelectItem>
           <SelectItem value="deputies">Deputies</SelectItem>
          <SelectItem value="magistrates">Magistrates</SelectItem>
        </SelectContent>
      </Select>

      <div className="mt-4">
        <h3 className="text-sm font-semibold">Headers</h3>

        {}
        {headers.map((header, index) => <div key={index} className="flex gap-2 items-center mt-2">
            <Input placeholder="Column Header" value={header.name} onChange={e => handleUpdateHeader(index, {
          name: e.target.value
        })} className="w-1/3" />
            <Select onValueChange={val => handleUpdateHeader(index, {
          type: val as HeaderField["type"]
        })} value={header.type}>
              <SelectTrigger className="w-1/3">
                <SelectValue placeholder="Field Type" />
              </SelectTrigger>
              <SelectContent>
  <SelectItem value="text">Text</SelectItem>
  <SelectItem value="number">Number</SelectItem>
  <SelectItem value="textarea">Text Area</SelectItem>
  <SelectItem value="dropdown">Dropdown</SelectItem>
  <SelectItem value="checkbox">Checkbox</SelectItem>
  <SelectItem value="date">Date</SelectItem> 
          </SelectContent>

            </Select>

            {}
            {header.type === "dropdown" && <Input placeholder="Comma separated options" value={header.options?.join(", ") || ""} onChange={e => handleUpdateHeader(index, {
          options: e.target.value.split(",")
        })} className="w-1/3" />}

        {header.type === "checkbox" && <div className="flex items-center space-x-2">
        <input type="checkbox" id={`checkbox-${index}`} className="w-5 h-5" />
        <label htmlFor={`checkbox-${index}`} className="text-sm">
          {header.name}
        </label>
      </div>}


        {header.type === "date" && <div className="flex items-center space-x-2">
    <input type="date" id={`date-${index}`} className="border rounded px-2 py-1" />
    <label htmlFor={`date-${index}`} className="text-sm">
      {header.name}
    </label>
  </div>}

            {}
            <Button variant="destructive" size="icon" onClick={() => handleDeleteHeader(index)}>
              <Trash className="w-4 h-4" />
            </Button>
          </div>)}

        {}
        <div className="flex flex-col gap-2 mt-4">
          <Input placeholder="New Column Header" value={newHeader} onChange={e => setNewHeader(e.target.value)} />
          <Select onValueChange={val => setHeaderType(val as HeaderField["type"])} value={headerType}>
            <SelectTrigger>
              <SelectValue placeholder="Field Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="textarea">Text Area</SelectItem>
              <SelectItem value="dropdown">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="date">Date</SelectItem>

            </SelectContent>
          </Select>
          {headerType === "dropdown" && <Input placeholder="Comma separated options" value={dropdownOptions} onChange={e => setDropdownOptions(e.target.value)} />}
          <Button onClick={handleAddHeader}>➕ Add Column</Button>
        </div>
      </div>

      <Button className="mt-4 w-full" onClick={handleSubmit}>
        {existingTemplate ? "Update" : "Create"} Template
      </Button>
    </div>;
}