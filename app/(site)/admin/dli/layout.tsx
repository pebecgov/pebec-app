import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - DLI Management",
};

export default function DLILayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}