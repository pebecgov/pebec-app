"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export default function UserProfilePage() {
  const { userId } = useParams() as { userId: string };
  const user = useQuery(api.users.getUserByClerkId, { clerkUserId: userId });
  const updateProfile = useMutation(api.users.updateUserProfile);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    state: "",
    address: "",
    businessName: "",
    industry: "",
    jobTitle: "",
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-semibold mb-2">Loading user...</h1>
      </div>
    );
  }

  const handleEditClick = () => {
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phoneNumber: user.phoneNumber || "",
      state: user.state || "",
      address: user.address || "",
      businessName: user.businessName || "",
      industry: user.industry || "",
      jobTitle: user.jobTitle || "",
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      toast.success("Profile updated!");
      setIsEditOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <Link href="/admin/users">
          <Button variant="outline">⬅️ Back to Users</Button>
        </Link>
        {/* <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleEditClick}>✏️ Edit Profile</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogTitle>Edit Profile</DialogTitle>
            <div className="grid gap-4 mt-4">
              {Object.entries(formData).map(([key, value]) => (
                <Input
                  key={key}
                  placeholder={key.replace(/([A-Z])/g, " $1")}
                  value={value}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                />
              ))}
              <Button onClick={handleSave} className="w-full mt-4">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog> */}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Side - Profile Picture + Basic Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border w-full md:w-1/3 flex flex-col items-center">
          <Image
            src={user.imageUrl || "/default-avatar.png"}
            alt="Profile Picture"
            width={120}
            height={120}
            className="rounded-full border object-cover"
          />
          <h1 className="mt-4 text-2xl font-semibold text-center">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-gray-500 mt-1">{user.email}</p>
          <p className="text-gray-600">{user.phoneNumber || "No Phone Number"}</p>

          <div className="mt-6">
            <span className="px-4 py-2 text-sm font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
              {user.role || "user"}
            </span>
          </div>
        </div>

        {/* Right Side - Details */}
        <div className="w-full md:w-2/3 space-y-8">
          {/* Personal Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Personal Information </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoRow label="State" value={user.state} />
              <InfoRow label="Address" value={user.address} />
              <InfoRow label="Business Name" value={user.businessName} />
              <InfoRow label="Industry" value={user.industry} />
              <InfoRow label="Job Title" value={user.jobTitle} />
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">System Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Role" value={user.role} />
              {user.role === "staff" && <InfoRow label="Staff Stream" value={user.staffStream} />}
              {user.role && ["mda", "reform_champion"].includes(user.role) && (
  <InfoRow label="MDA Name" value={user.mdaName} />
)}
              {user.role === "saber_agent" && (
                <InfoRow label="EC Confirmed" value={user.ecConfirmed ? "✅ Yes" : "❌ No"} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 📦 Small reusable component for InfoRow
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-gray-800">{value || "—"}</span>
    </div>
  );
}
