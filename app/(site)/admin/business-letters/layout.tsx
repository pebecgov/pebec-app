import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ADMIN - Business Letters",
};

export default function BusinessLettersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
    