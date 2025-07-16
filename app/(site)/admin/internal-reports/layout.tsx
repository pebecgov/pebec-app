import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ADMIN - Report Templates",
};

export default function InternalReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
    