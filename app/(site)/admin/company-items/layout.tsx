import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ADMIN - Company Properties",
};

export default function CompanyItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
