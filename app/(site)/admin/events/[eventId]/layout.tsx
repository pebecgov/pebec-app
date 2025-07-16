import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Event Details",
};

export default function EventDetailsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}