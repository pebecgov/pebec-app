import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ReportGov Agent - Profile",
};

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}