// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import ReportGovGuestForm from "@/components/ReportGovGuestForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import { useSearchParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { SignUpButton } from "@clerk/nextjs";
export default function GuestReport() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldShowNotice = searchParams.get("guest") === "1";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldShowNotice) setOpen(true);
  }, [shouldShowNotice]);

  return <div className="min-h-screen bg-gray-50 mt-20">
      
      {}
      <div className="bg-gradient-to-r from-green-100 via-white to-green-50 py-10">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            


          {}
          <div>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
  <Link href="/reportgov-ng">
    <Button variant="outline" className="mb-4">
      ← Back to ReportGov
    </Button>
  </Link>
          </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
              Submit a Complaint
            </h1>
            <p className="mt-3 text-gray-600 text-base leading-relaxed">
              Guest Mode — No sign-in required. Quickly file a complaint & track its progress.
            </p>

            <Link href="/reportgov-check-status">
              <Button className="bg-green-600 hover:bg-green-700 text-white mt-5 px-5 py-2 text-sm inline-flex items-center gap-2">
                <FaSearch className="w-4 h-4" />
                Check Ticket Status
              </Button>
            </Link>
          </div>

          {}
          <div className="flex justify-center">
            <img src="/images/complaint-guest.svg" alt="Complaint Illustration" className="w-[250px] md:w-[300px] object-contain" />
          </div>
        </div>
      </div>


      {}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="bg-white shadow-2xl rounded-2xl p-6 sm:p-10">
          <ReportGovGuestForm />
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600">Notice</DialogTitle>
            <DialogDescription className="text-lg text-gray-500">
            If you continue as a guest, you won't be able to see the agent's responses or add further information to your tickets.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="text-xl">
            <SignUpButton mode="modal">
              <Button variant="outline" className="px-6 py-3 text-base sm:text-lg" onClick={() => setOpen(false)}>Create an account</Button>
            </SignUpButton>
            <Button className="px-6 py-3 text-base sm:text-lg" onClick={() => setOpen(false)}>Continue as a guest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}