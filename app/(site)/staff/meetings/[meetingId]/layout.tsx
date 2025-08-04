import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - Materials",
};

export default function MaterialsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}