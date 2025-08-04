import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Staff - Recieved Letters",
};

export default function recieveLetterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}