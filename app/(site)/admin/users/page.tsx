"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import InternalApprovals from "@/components/Admin/ApprovalList";
import Admin from "./users";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react"; // already partially imported
import { useEffect } from "react";


export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "approvals">("users");

  const pendingRequests = useQuery(api.users.getPendingRoleRequests) || [];
  const getCurrentAccessCode = useMutation(api.users.generateMonthlyAccessCode);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [nextCodeDate, setNextCodeDate] = useState<string | null>(null);
  

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const code = await getCurrentAccessCode({});
        setAccessCode(code);
  
        // Calculate the 1st day of next month
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        setNextCodeDate(nextMonth.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }));
      } catch (err) {
        console.error("Failed to load access code", err);
      }
    };
  
    fetchCode();
  }, [getCurrentAccessCode]);

  

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Admin Panel</h1>
      {accessCode && nextCodeDate && (
  <div className="mb-4 p-4 border rounded-md bg-gray-100 text-sm">
    <p><strong>Current Internal Access Code:</strong> <code>{accessCode}</code></p>
    <p><strong>Next Code Will Be Generated On:</strong> {nextCodeDate}</p>
  </div>
)}


      <Tabs value={tab} onValueChange={(value) => setTab(value as "users" | "approvals")}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="approvals">
            Internal Approvals {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Admin />
        </TabsContent>

        <TabsContent value="approvals">
          <InternalApprovals />
        </TabsContent>
      </Tabs>
    </div>
  );
}
