import { Metadata } from "next";
export const metadata: Metadata = {
    title: "WORLD BANK - DLI Status",
};

export default function SaberMaterialsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}