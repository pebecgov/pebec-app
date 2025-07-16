import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Media Posts",
};

export default function CreateMediaPostLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}