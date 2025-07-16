import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Manage Projects",
};

export default function ProjectsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}