import { Metadata } from "next";

export const metadata: Metadata = {
  title: "REPORTGOV - Tickets",
};

export default function TicketDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 