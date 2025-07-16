import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - DLI Status",
};

export default function SaberLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}