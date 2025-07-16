import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Saber Overview",
};

export default function SaberOverviewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
