// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

"use client";

import React, { useState } from "react";
import HolidayWhereaboutForm from "./HolidayWhereaboutForm";
import HolidayAnnouncementsDisplay from "./HolidayAnnouncementsDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, EyeIcon } from "@heroicons/react/24/outline";

export default function HolidayWhereabout() {
  const [activeTab, setActiveTab] = useState("announcements");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Absence Notice</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">

          Keep PEBEC informed whenever you are absent from the office.
        </p>
      </div>
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full ">
          <TabsList className="grid w-full grid-cols-2 ">
            <TabsTrigger value="announcements" className="flex items-center gap-2 p-2 text-md">
              <PlusIcon className="w-4 h-4" />
              Submit Absence Notice
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2 p-2 text-md">
              <EyeIcon className="w-4 h-4" />
              View Absence Notices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="mt-6">
            <HolidayWhereaboutForm onSuccess={() => setActiveTab("view")} />
          </TabsContent>

          <TabsContent value="view" className="mt-6">
            <Tabs defaultValue="active" className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="active">Active & Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past History</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="active">
                <HolidayAnnouncementsDisplay type="active" />
              </TabsContent>

              <TabsContent value="past">
                <HolidayAnnouncementsDisplay type="past" />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>



      {activeTab === "announcements" && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              Guidelines for Using the Absence Notice System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🤒</div>
                <h3 className="font-semibold mb-2">Sick Leave</h3>
                <p className="text-sm text-gray-600">
                  Notify PEBEC whenever you are unwell and unable to attend work.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">📋</div>
                <h3 className="font-semibold mb-2">Official Assignment</h3>
                <p className="text-sm text-gray-600">
                  Record your absence when assigned official duties outside the office.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🏖️</div>
                <h3 className="font-semibold mb-2">Holiday</h3>
                <p className="text-sm text-gray-600">
                  Submit notice for vacation or approved personal time off.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
