import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ADMIN - Internal Letters",
};

export default function LettersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}