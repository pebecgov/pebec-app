"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FaSpinner } from "react-icons/fa";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Label } from "@/components/ui/label";

export default function DmoReportsPage() {
  const [filterAssessment, setFilterAssessment] = useState<"all" | "met" | "unmet" | "pending">("all");
  const reports = useQuery(api.dmo_reports.getAllDmoReports) ?? [];
  const assessReport = useMutation(api.dmo_reports.assessDmoReport);

  const filteredReports = reports.filter((report) => {
    if (filterAssessment === "all") return true;
    if (filterAssessment === "pending") return !report.dmoAssessment;
    return report.dmoAssessment === filterAssessment;
  });

  const handleAssess = async (reportId: Id<"dmo_reports">, assessment: "met" | "unmet") => {
    try {
      await assessReport({
        reportId,
        assessment,
      });
      toast.success(`Report assessed as ${assessment.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to assess report");
    }
  };

  const getStatusBadge = (report: any) => {
    if (report.dmoAssessment === "met") {
      return <Badge className="bg-green-100 text-green-800 border-green-500">MET</Badge>;
    }
    if (report.dmoAssessment === "unmet") {
      return <Badge className="bg-red-100 text-red-800 border-red-500">UNMET</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-500">PENDING</Badge>;
  };

  const getDeadlineStatus = (report: any) => {
    const now = Date.now();
    const daysUntilDeadline = Math.ceil((report.deadline - now) / (24 * 60 * 60 * 1000));
    const isPastDeadline = now > report.deadline;

    if (isPastDeadline) {
      return <span className="text-red-600 font-semibold">Past Deadline</span>;
    }
    if (daysUntilDeadline <= 7) {
      return <span className="text-yellow-600 font-semibold">{daysUntilDeadline} days left</span>;
    }
    return <span className="text-green-600">{daysUntilDeadline} days left</span>;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>DMO Reports Review</CardTitle>
          <CardDescription>
            Review and assess DSA/DMS publication reports submitted by SABER agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <Label>Filter by Assessment:</Label>
            <Select value={filterAssessment} onValueChange={(value: any) => setFilterAssessment(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="pending">Pending Assessment</SelectItem>
                <SelectItem value="met">Met</SelectItem>
                <SelectItem value="unmet">Unmet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reports found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Link Published</TableHead>
                    <TableHead>Web Link</TableHead>
                    <TableHead>Published Date</TableHead>
                    <TableHead>Deadline Status</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow
                      key={report._id}
                      className={report.statusColor || ""}
                    >
                      <TableCell className="font-medium">{report.state}</TableCell>
                      <TableCell>{report.submitterName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={report.linkPublished === "yes" ? "default" : "secondary"}
                        >
                          {report.linkPublished}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.webLink ? (
                          <Link
                            href={report.webLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Link
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.publishedDate
                          ? new Date(report.publishedDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>{getDeadlineStatus(report)}</TableCell>
                      <TableCell>{getStatusBadge(report)}</TableCell>
                      <TableCell>
                        {!report.dmoAssessment ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-500 hover:bg-green-100"
                              onClick={() => handleAssess(report._id, "met")}
                            >
                              Mark as Met
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-500 hover:bg-red-100"
                              onClick={() => handleAssess(report._id, "unmet")}
                            >
                              Mark as Unmet
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Assessed by: {report.assessorName || "Unknown"}
                            <br />
                            {report.assessedAt &&
                              new Date(report.assessedAt).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
