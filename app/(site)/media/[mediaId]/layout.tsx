import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Media Post",
};

export default function MediaPostLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}