import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Profile",
};

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}