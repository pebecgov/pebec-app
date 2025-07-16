import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Newsletter Subscribers",
};

export default function SubscribersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}