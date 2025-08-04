import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - ReportGov Management",
};

export default function ReportGovLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}