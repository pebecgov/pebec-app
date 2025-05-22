// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
export default function FillReportForm({
  template,
  onClose
}) {
  const {
    user
  } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");
  const convexUserId = convexUser?._id;
  const submitReport = useMutation(api.internal_reports.submitInternalReport);
  const [formData, setFormData] = useState(() => template.headers.map(() => ""));
  const handleChange = (index, value) => {
    setFormData(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };
  const handleSubmit = async () => {
    if (!convexUserId) {
      toast.error("User not found in the database.");
      return;
    }
    try {
      await submitReport({
        templateId: template._id,
        submittedBy: convexUserId,
        role: template.role,
        data: formData.map(value => [value])
      });
      toast.success("Report submitted successfully!");
      onClose();
    } catch {
      toast.error("Failed to submit report.");
    }
  };
  return <div className="space-y-4">
      <h3 className="text-lg font-semibold">{template.title}</h3>
      {template.headers.map((header, index) => <div key={index} className="mb-3">
          <label className="font-semibold">{header.name}</label>
          {header.type === "textarea" ? <Textarea value={formData[index]} onChange={e => handleChange(index, e.target.value)} /> : <Input type={header.type === "number" ? "number" : "text"} value={formData[index]} onChange={e => handleChange(index, e.target.value)} />}

      {header.type === "checkbox" && <div className="flex items-center space-x-2">
        <input type="checkbox" id={`checkbox-${index}`} className="w-5 h-5" />
        <label htmlFor={`checkbox-${index}`} className="text-sm">
          {header.name}
        </label>
      </div>}
        </div>)}
      <Button onClick={handleSubmit}>✅ Submit Report</Button>
    </div>;
}