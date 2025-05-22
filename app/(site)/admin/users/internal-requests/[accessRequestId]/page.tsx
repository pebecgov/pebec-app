// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { setRole } from "@/app/(site)/admin/users/action";
type AllowedRole = "mda" | "staff" | "reform_champion" | "saber_agent" | "deputies" | "magistrates" | "state_governor";
export default function ViewInternalRequest() {
  const router = useRouter();
  const {
    accessRequestId
  } = useParams();
  const {
    toast
  } = useToast();
  const user = useQuery(api.users.getUserByIds, {
    id: accessRequestId as Id<"users">
  });
  const approve = useMutation(api.users.approveRoleRequest);
  const reject = useMutation(api.users.rejectRoleRequest);
  const [isLoading, setIsLoading] = useState(false);
  const handleApprove = async () => {
    if (!user?.roleRequest?.requestedRole) {
      toast({
        title: "Missing Role",
        description: "This request has no valid role.",
        variant: "destructive"
      });
      return;
    }
    const validRoles: AllowedRole[] = ["mda", "staff", "reform_champion", "saber_agent", "deputies", "magistrates", "state_governor"];
    if (!validRoles.includes(user.roleRequest.requestedRole as AllowedRole)) {
      toast({
        title: "Invalid Role",
        description: "Requested role is not recognized.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      await approve({
        userId: accessRequestId as Id<"users">,
        role: user.roleRequest.requestedRole as AllowedRole,
        mdaName: user.roleRequest?.mdaName || "",
        phoneNumber: user.phoneNumber || "",
        state: user.roleRequest?.state || ""
      });
      const formData = new FormData();
      formData.append("id", user.clerkUserId);
      formData.append("role", user.roleRequest.requestedRole);
      await setRole(formData);
      toast({
        title: "Approved",
        description: "Request approved successfully."
      });
      router.push("/admin/users");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleReject = async () => {
    setIsLoading(true);
    try {
      await reject({
        userId: accessRequestId as Id<"users">
      });
      toast({
        title: "Rejected",
        description: "Request rejected."
      });
      router.push("/admin/internal-approvals");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  if (user === undefined) {
    return <p className="p-6">Loading...</p>;
  }
  if (!user) {
    return <p className="p-6 text-red-600">❌ User not found.</p>;
  }
  return <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Internal Role Request</h1>

      <div className="bg-white shadow border rounded-md p-6 space-y-4">
        <div><strong>Full Name:</strong> {user.firstName} {user.lastName}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Phone Number:</strong> {user.phoneNumber || "—"}</div>
        <div><strong>Requested Role:</strong> {user.roleRequest?.requestedRole}</div>
        <div><strong>Job Title:</strong> {user.roleRequest?.jobTitle || "—"}</div>
        <div><strong>MDA Name:</strong> {user.roleRequest?.mdaName || "—"}</div>
        <div><strong>State:</strong> {user.roleRequest?.state || "—"}</div>
        <div><strong>Address:</strong> {user.roleRequest?.address || "—"}</div>
        <div><strong>Submitted:</strong> {new Date(user.roleRequest?.submittedAt || 0).toLocaleString()}</div>
      </div>

      <div className="flex gap-4 mt-6">
        <Button onClick={handleApprove} disabled={isLoading}>
          ✅ Approve
        </Button>
        <Button variant="destructive" onClick={handleReject} disabled={isLoading}>
          ❌ Reject
        </Button>
        <Link href="/admin/users">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    </div>;
}