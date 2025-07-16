import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ADMIN - ReportGov",
};

export default function TicketsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}