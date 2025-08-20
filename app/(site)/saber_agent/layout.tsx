// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { Metadata } from "next";
import SaberAgentLayoutClient from "./SaberAgentLayoutClient";

export const metadata: Metadata = {
  title: "SABER Agent - PEBEC",
  description: "SABER Agent Dashboard for PEBEC",
};

export default function SaberAgentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <SaberAgentLayoutClient>{children}</SaberAgentLayoutClient>;
}