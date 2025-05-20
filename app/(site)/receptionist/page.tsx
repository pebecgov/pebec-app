"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import LineChart from "@/components/ui/Linechart";
import AdminViewLettersPage from "./letters/page";

export default function SubNational() {
  const [activeTab, setActiveTab] = useState("reports");

  const user = useQuery(api.users.getCurrentUsers);
  const reports = useQuery(api.internal_reports.getSubmittedInternalReports, user?._id ? { submittedBy: user._id } : "skip");

  const thisMonthReports = reports?.filter((r) => {
    const date = new Date(r.submittedAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }) ?? [];

  return (
    <div className="mt-5 grid gap-6 max-w-6xl mx-auto px-4">
    <AdminViewLettersPage/>
      </div>
    
  );
}
