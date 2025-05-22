// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import InternalRoleRequestForm from "@/components/RequestRoleForm/InternalRoleRequestForm";
import { useRouter } from "next/navigation";
export default function InternalRequestContent() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUsers);
  const getCurrentCode = useMutation(api.users.generateMonthlyAccessCode);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  useEffect(() => {
    const accessGranted = sessionStorage.getItem("accessGranted");
    if (accessGranted === "true") {
      setAuthorized(true);
    } else {
      const input = prompt("Enter your internal access code:");
      if (!input) {
        router.push("/");
        return;
      }
      getCurrentCode({}).then(validCode => {
        if (input === validCode) {
          sessionStorage.setItem("accessGranted", "true");
          setAuthorized(true);
        } else {
          alert("Invalid code. Redirecting...");
          router.push("/");
        }
      }).catch(() => {
        alert("Error verifying code.");
        router.push("/");
      });
    }
  }, [router, getCurrentCode]);
  if (user === undefined || authorized === null) {
    return <div className="pt-40 pb-20 text-center">Loading...</div>;
  }
  if (!user) {
    return <div className="pt-40 pb-20 text-center text-red-500 font-semibold">
        You must be logged in to request access.
      </div>;
  }
  return <div className="pb-20 pt-30">
      <InternalRoleRequestForm user={user} />
    </div>;
}