// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { FaUserAlt, FaSignInAlt } from "react-icons/fa";
export default function ReportGovModal({
  onClose
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    isSignedIn
  } = useUser();
  useEffect(() => {
    if (isSignedIn) {
      router.push("/reportgov");
    }
  }, [isSignedIn]);
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };
  const handleGuestClick = () => {
    onClose();
    setTimeout(() => router.push("/reportgov-guest"), 0);
  };
  const handleSignInClick = () => {
    onClose();
    setTimeout(() => router.push("/sign-in"), 0);
  };
  const handleStatusCheckClick = () => {
    onClose();
    setTimeout(() => router.push("/reportgov-check-status"), 0);
  };
  return <Dialog open onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-3xl mx-auto p-8">
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-bold">
            Welcome to <span className="text-[#239b57]">ReportGov</span>
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-2 text-base">
            Choose how you’d like to proceed to submit your complaint
          </DialogDescription>
        </DialogHeader>

        {}
        <div className="flex justify-center mt-4 mb-8">
          <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-sm font-medium rounded-full shadow" onClick={handleStatusCheckClick}>
            Complaint Status Checker
          </Button>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {}
          <div className="flex flex-col justify-between border rounded-xl p-6 bg-white shadow-sm min-h-[280px]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FaUserAlt className="text-green-600 text-xl" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Guest Submission
                </h3>
              </div>
              <div className="text-sm text-gray-600">
                <p>
                  Continuing as a guest, you'll have the following permissions:
                </p>
                <ul className="list-disc ml-6 mt-2 text-gray-500">
                  <li>Submit a complaint by completing 4 steps</li>
                  <li>Receive updates via email</li>
                  <li>Check complaint status via ticket number</li>
                </ul>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-6" onClick={handleGuestClick}>
              Continue as Guest
            </Button>
          </div>

          {}
          <div className="flex flex-col justify-between border rounded-xl p-6 bg-white shadow-sm min-h-[280px]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FaSignInAlt className="text-green-700 text-xl" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Sign In / Sign Up
                </h3>
              </div>
              <div className="text-sm text-gray-600">
                <p>With an account, you’ll benefit from:</p>
                <ul className="list-disc ml-6 mt-2 text-gray-500">
                  <li>Dashboard for all complaints</li>
                  <li>In-app updates and notifications</li>
                  <li>Cancel or comment on your complaints</li>
                </ul>
              </div>
            </div>
            <Button className="w-full mt-6 bg-green-700 hover:bg-green-800 text-white" onClick={handleSignInClick}>
              Sign In / Sign Up
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          By continuing, you agree to our{" "}
          <span className="underline cursor-pointer hover:text-gray-600">
            terms of service
          </span>.
        </div>
      </DialogContent>
    </Dialog>;
}