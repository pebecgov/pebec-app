import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Edit Event",
};

export default function EditEventLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}