// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React from "react";
import { Metadata } from "next";
import PEBECMembers from "@/components/Members/page";
export const metadata: Metadata = {
  title: "PEBEC Members",
  description: "Members"
};
const SupportPage = () => {
  return <div className="pb-20 pt-40">
      <PEBECMembers />
    </div>;
};
export default SupportPage;