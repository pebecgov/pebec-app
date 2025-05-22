// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUserRole } from "@/lib/useUserRole";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import UserTicketForm from "@/components/UserTicketForm";
import UserOpenTickets from "@/components/UserOpenTickets";
import EventTickets from "@/components/EventTickets";
import UserProfile from "@/components/UserProfile";
import FeedbackForm from "@/components/Feedback";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import HeroSection from "@/components/ReportGovBanner";
import TabsWithIcons from "@/components/TabsWithIcons";
import ReportGovModal from "../../reportgov-options/page";
export default function User() {
  const [activeTab, setActiveTab] = useState("report");
  const [showDialog, setShowDialog] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: "",
    state: "",
    address: "",
    businessName: "",
    industry: ""
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const router = useRouter();
  const role = useUserRole();
  const {
    user,
    isSignedIn
  } = useUser();
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const userData = useQuery(api.users.getUserDetails);
  useEffect(() => {
    if (!isSignedIn) {
      setShowGuestModal(true);
    }
  }, [isSignedIn]);
  useEffect(() => {
    if (userData) {
      setForm({
        phoneNumber: userData.phoneNumber || "",
        state: userData.state || "",
        address: userData.address || "",
        businessName: userData.businessName || "",
        industry: userData.industry || ""
      });
    }
  }, [userData]);
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      if (!user.firstName || !user.lastName) {
        setShowDialog(true);
      }
    }
  }, [user]);
  const isUserProfileIncomplete = useMemo(() => {
    if (!user || !userData) return true;
    return !userData.phoneNumber || !userData.state || !userData.address || !user.firstName || !user.lastName;
  }, [userData, user]);
  const handleSave = async () => {
    if (!user) return;
    try {
      await user.update({
        firstName,
        lastName
      });
      await updateUserProfile({
        firstName,
        lastName,
        phoneNumber: form.phoneNumber,
        state: form.state,
        address: form.address,
        businessName: form.businessName,
        industry: form.industry
      });
      setShowDialog(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };
  if (!role || userData === undefined) {
    return <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col gap-4 items-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-red-500 rounded-full animate-spin" />
          <p className="text-gray-700 text-lg">Loading...</p>
        </div>
      </div>;
  }
  if (!isSignedIn && showGuestModal) {
    return <div className="flex justify-center items-center min-h-screen bg-white">
        <ReportGovModal onClose={() => router.push("/reportgov-guest")} />
      </div>;
  }
  if (!user || !userData) {
    return <div className="flex h-screen w-full items-center justify-center bg-white">
        <p className="text-gray-700 text-lg">Redirecting...</p>
      </div>;
  }
  return <section className="pb-20 pt-30">
      <div className="container max-w-6xl mx-auto">
        <HeroSection />

        <TabsWithIcons activeTab={activeTab} setActiveTab={setActiveTab} isUserProfileIncomplete={isUserProfileIncomplete} />

        <div className="flex flex-col gap-10 xl:flex-row xl:items-start">
          <main className="flex-1 xl:py-20">
            {activeTab === "report" && <UserTicketForm />}
            {activeTab === "feedback" && <FeedbackForm />}
            {activeTab === "status" && <UserOpenTickets />}
            {activeTab === "events" && <EventTickets />}
            {activeTab === "profile" && <UserProfile />}
          </main>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please enter your first and last name to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
            <Input placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!firstName || !lastName}>
              Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>;
}