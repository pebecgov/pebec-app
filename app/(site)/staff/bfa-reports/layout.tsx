import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - BFA Reports",
};

export default function BFAReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}