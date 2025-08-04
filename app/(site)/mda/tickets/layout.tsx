import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ReportGov Agent - Tickets",
};

export default function sendLetterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}