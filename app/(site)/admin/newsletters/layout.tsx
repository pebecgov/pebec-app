import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Manage Newsletters",
};

export default function NewslettersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}