import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ADMIN - Upload Reports",
};

export default function ReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}