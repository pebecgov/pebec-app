import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - Letters",
};

export default function LetterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}