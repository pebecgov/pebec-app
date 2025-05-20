"use client";

import UserTicketForm from "./UserTicketForm";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ReportGovGuestForm() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <UserTicketForm guestMode />
   
    </div>
  );
}
