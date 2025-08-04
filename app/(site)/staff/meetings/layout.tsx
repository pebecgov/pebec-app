import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - Meetings",
};

export default function MeetingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}