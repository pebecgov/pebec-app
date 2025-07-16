import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Edit Article",
};

export default function EditPostLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}