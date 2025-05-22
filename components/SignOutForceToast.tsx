// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
export function ShowForceSignOutToast() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("error") === "use-primary-email") {
      toast.error("⚠ Please sign in with your primary email address.");
    }
  }, []);
  return null;
}