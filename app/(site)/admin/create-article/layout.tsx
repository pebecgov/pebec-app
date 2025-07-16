import { Metadata } from "next";
export const metadata: Metadata = {
    title: "ADMIN - Create Article",
};

export default function CreateArticleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}