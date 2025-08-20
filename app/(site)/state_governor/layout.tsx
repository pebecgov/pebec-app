// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { Metadata } from "next";
import StateGovernorLayoutClient from "./StateGovernorLayoutClient";

export const metadata: Metadata = {
  title: "State Governor - PEBEC",
  description: "State Governor Dashboard for PEBEC",
};

export default function StateGovernorLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <StateGovernorLayoutClient>{children}</StateGovernorLayoutClient>;
}