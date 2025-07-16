import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Manage Events",
};

export default function EventsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}