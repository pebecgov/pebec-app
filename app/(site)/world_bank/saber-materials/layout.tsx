import { Metadata } from "next";
export const metadata: Metadata = {
    title: "WORLD BANK - SABER Materials",
};

export default function SaberMaterialsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}