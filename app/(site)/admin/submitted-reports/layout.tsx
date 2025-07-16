import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Internal Reports",
};

export default function SubmittedReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}