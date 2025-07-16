import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - DLI & BERAP Management",
};

export default function SaberManagementLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}