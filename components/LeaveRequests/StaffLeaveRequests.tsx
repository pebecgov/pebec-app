"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import { LeaveRequestApplyDialog } from "./LeaveRequestApplyDialog";
import { LeaveRequestDetailDialog } from "./LeaveRequestDetailDialog";

function statusBadge(status: string) {
  if (status === "approved") return <Badge className="bg-green-600">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export default function StaffLeaveRequests() {
  const balance = useQuery(api.leaveRequests.getLeaveBalance, {});
  const requests = useQuery(api.leaveRequests.listMyLeaveRequests, {});
  const [applyOpen, setApplyOpen] = useState(false);
  const [detailId, setDetailId] = useState<Id<"leaveRequests"> | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Leave requests</h1>
    
      </div>

      {balance && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Allowance ({balance.year})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{balance.annualAllowance}</p>
              <p className="text-xs text-muted-foreground">working days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{balance.used}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{balance.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">{balance.remaining}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setApplyOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Apply for leave
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My leave history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!requests?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No leave requests yet
                  </TableCell>
                </TableRow>
              )}
              {requests?.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="font-medium">{r.subject}</TableCell>
                  <TableCell>
                    {r.startDate} – {r.endDate}
                  </TableCell>
                  <TableCell>{r.workingDays}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDetailId(r._id)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LeaveRequestApplyDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSuccess={() => setApplyOpen(false)}
      />
      <LeaveRequestDetailDialog
        leaveRequestId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
