"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useUserRole() {
  const { user, isLoaded } = useUser();

  // ⏳ Only fetch the role if the user is loaded
  const role = useQuery(api.users.getUserRoles, user ? { userId: user.id } : "skip");

  return {
    role: role || "user", // Default role is "user"
    isLoading: !isLoaded || role === undefined, // Prevent rendering until loaded
  };
}