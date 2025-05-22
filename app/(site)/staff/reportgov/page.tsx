// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useUser } from "@clerk/nextjs";
import AdminTicketsPage from "@/components/AdminTickets";
const allowedStreams = ["regulatory", "innovation", "communications"];
export default function TicketsPage() {
  const {
    user,
    isLoaded
  } = useUser();
  if (!isLoaded) return null;
  const role = user?.publicMetadata?.role;
  const stream = user?.publicMetadata?.staffStream;
  const isAuthorized = role === "staff" && typeof stream === "string" && allowedStreams.includes(stream);
  if (!isAuthorized) {
    return <p className="text-red-500 text-center mt-10">
        🚫 Unauthorized: You do not have access to this page.
      </p>;
  }
  return <AdminTicketsPage />;
}