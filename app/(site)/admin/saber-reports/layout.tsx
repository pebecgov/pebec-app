import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Saber Reports",
};

export default function SaberReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
