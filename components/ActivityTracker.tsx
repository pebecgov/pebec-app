// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useGlobalActivityTracker } from "@/lib/useGlobalActivityTracker";

export default function ActivityTracker() {
  // This automatically tracks all user activity across the entire app
  useGlobalActivityTracker();
  
  return null; // This component doesn't render anything
}
