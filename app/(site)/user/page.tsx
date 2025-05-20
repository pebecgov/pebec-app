"use client";

import { useEffect, useMemo, useState } from "react";
import { FaNewspaper, FaTools, FaCalendarAlt, FaUserAlt } from "react-icons/fa";
import { useUserRole } from "@/lib/useUserRole";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import UserTicketForm from "@/components/UserTicketForm"; 
import UserOpenTickets from "@/components/UserOpenTickets";
import EventTickets from "@/components/EventTickets";
import UserProfile from "@/components/UserProfile";
import FeedbackForm from "@/components/Feedback";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {  useUser } from "@clerk/nextjs";
import HeroSection from "@/components/ReportGovBanner";
import { useAuth, SignOutButton } from "@clerk/nextjs";

import TabsWithIcons from "@/components/TabsWithIcons";

export default function User() {
  const [activeTab, setActiveTab] = useState("report");
  const [isLoading, setIsLoading] = useState(true);
  const role = useUserRole();
  const router = useRouter();
  const { user } = useUser(); // ✅ Correct way to access Clerk user
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const [form, setForm] = useState({
    phoneNumber: "",
    state: "",
    address: "",
    businessName: "",
    industry: "",
  });
  const [showDialog, setShowDialog] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  // ✅ Fetch User Data
  const userData = useQuery(api.users.getUserDetails);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut(); // Sign out using Clerk
    router.push("/"); // Redirect to home
  };
  
  // ✅ Check if user profile is incomplete
  const isUserProfileIncomplete = useMemo(() => {
    if (!userData) return true; // Assume incomplete until data is available
    return !userData.phoneNumber || !userData.state || !userData.address || !user?.firstName || !user?.lastName;
  }, [userData]);


  // ✅ Load user data into the form state
useEffect(() => {
  if (userData) {
    setForm({
      phoneNumber: userData.phoneNumber || "",
      state: userData.state || "",
      address: userData.address || "",
      businessName: userData.businessName || "",
      industry: userData.industry || "",
    });
  }
}, [userData]);


  // ✅ Ensure Dialog opens if firstName or lastName is missing
  useEffect(() => {
    if (user && (!user.firstName || !user.lastName)) {
      setShowDialog(true);
    }
  }, [user]);

  // ✅ Fix `handleSave` function
const handleSave = async () => {
  if (!user) return;

  try {
    // ✅ Update Clerk user
    await user.update({ firstName, lastName });

    // ✅ Update Convex with form data
    await updateUserProfile({
      firstName,
      lastName,
      phoneNumber: form.phoneNumber, // Now form exists!
      state: form.state,
      address: form.address,
      businessName: form.businessName,
      industry: form.industry,
    });

    setShowDialog(false); // Close dialog after update
  } catch (error) {
    console.error("Failed to update profile", error);
  }
};
  // ✅ Simulate Page Load Effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200); // Simulated loading delay
    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []);

  // ✅ Show loading spinner until everything is ready
  if (isLoading || !role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col gap-4 w-full items-center justify-center">
          <div className="w-20 h-20 border-4 border-transparent animate-spin flex items-center justify-center border-t-blue-400 rounded-full">
            <div className="w-16 h-16 border-4 border-transparent animate-spin flex items-center justify-center border-t-red-400 rounded-full"></div>
          </div>
          <p className="text-gray-700 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="pb-20 pt-30">
      <div className="container max-w-6xl mx-auto">

        {/* 🔴 Page Title and Subtitle */}
       
      <HeroSection/>
      
      <div className="flex justify-end mt-6">
  <Button
    onClick={handleSignOut}
    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
  >
    Sign Out
  </Button>
</div>

        {/* Tabs List */}
{/* ✅ Tabs Navigation with Profile Warning */}
<TabsWithIcons 
  activeTab={activeTab} 
  setActiveTab={setActiveTab} 
  isUserProfileIncomplete={isUserProfileIncomplete} 
/>

        {/* Main Content Layout */}
        <div className="flex flex-col gap-10 xl:flex-row xl:items-start">
          <main className="flex-1 xl:py-20">
            
            {/* Report a Problem Form */}
            {activeTab === "report" && (
              <div className="mt-1">
                <UserTicketForm />
              </div>
            )}

            {/* Feedback Form */}
            {activeTab === "feedback" && (
              <div className="mt-6">
                <FeedbackForm />
              </div>
            )}

            {/* Open Tickets */}
            {activeTab === "status" && (
              <div className="mt-6">
                <UserOpenTickets />
              </div>
            )}

            {/* Event Tickets */}
            {activeTab === "events" && (
              <div className="mt-6">
                <EventTickets />
              </div>
            )}

             {/* Profile Tab */}
             {activeTab === "profile" && (
              <div className="mt-6">
                <UserProfile />
              </div>
            )}
          </main>
        </div>
      </div>

       {/* 🚨 Dialog for First & Last Name Completion */}
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please enter your first and last name to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!firstName || !lastName}>
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    
    </section>
  );
}
