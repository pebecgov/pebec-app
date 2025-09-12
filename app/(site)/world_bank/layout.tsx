// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { Metadata } from "next";
import WorldBankLayoutClient from "./WorldBankLayoutClient";

export const metadata: Metadata = {
  title: "DLI Dashboard - PEBEC",
  description: "DLI Analysis Dashboard for PEBEC - NGF, DMO, and World Bank",
};

export default function WorldBankLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <WorldBankLayoutClient>{children}</WorldBankLayoutClient>;
} 