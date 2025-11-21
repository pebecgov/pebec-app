// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { Metadata } from "next";
import DmoLayoutClient from "./DmoLayoutClient";

export const metadata: Metadata = {
  title: "DMO - PEBEC",
  description: "DMO Dashboard for PEBEC",
};

export default function DmoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <DmoLayoutClient>{children}</DmoLayoutClient>;
}

