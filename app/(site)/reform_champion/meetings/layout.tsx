import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Reform Champion - Meetings",
};

export default function MeetingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}