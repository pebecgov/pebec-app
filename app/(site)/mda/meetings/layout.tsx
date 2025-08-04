import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ReportGov Agent - Meetings",
};

export default function sendLetterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}