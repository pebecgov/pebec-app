import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - Tickets",
};

export default function TicketsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}