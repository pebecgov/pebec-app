// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
export function useUserRole() {
  const {
    user,
    isLoaded
  } = useUser();
  const role = useQuery(api.users.getUserRoles, user ? {
    userId: user.id
  } : "skip");
  return {
    role: role || "user",
    isLoading: !isLoaded || role === undefined
  };
}