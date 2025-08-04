import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - Send Letters",
};

export default function SendLetterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}