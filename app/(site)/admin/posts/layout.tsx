import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Manage Articles",
};

export default function PostsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
