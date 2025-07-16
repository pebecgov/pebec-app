import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ADMIN - Shared Tasks",
};

export default function KandanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 