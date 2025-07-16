import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Project Details",
};

export default function ProjectDetailsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}