// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import UserTicketForm from "./UserTicketForm";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
export default function ReportGovGuestForm() {
  const router = useRouter();
  return <div className="space-y-6">
      <UserTicketForm guestMode />
   
    </div>;
}