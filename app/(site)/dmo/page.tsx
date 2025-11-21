// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export default function DmoDashboard() {
  const reports = useQuery(api.dmo_reports.getAllDmoReports) ?? [];
  
  const pendingReports = reports.filter((r) => !r.dmoAssessment).length;
  const metReports = reports.filter((r) => r.dmoAssessment === "met").length;
  const unmetReports = reports.filter((r) => r.dmoAssessment === "unmet").length;
  const totalReports = reports.length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">DMO Dashboard</h1>
        <p className="text-gray-600 mt-2">Review and assess DSA/DMS publication reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Met</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{metReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unmet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{unmetReports}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage DMO reports and assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dmo/reports">
            <Button className="w-full md:w-auto">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              View All Reports
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

