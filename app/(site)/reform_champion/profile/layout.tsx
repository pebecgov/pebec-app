import { Metadata } from "next";
export const metadata: Metadata = {
    title: "Reform Champion - Profile",
};

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}