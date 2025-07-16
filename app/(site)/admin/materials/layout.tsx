import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Material",
};

export default function MaterialsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}