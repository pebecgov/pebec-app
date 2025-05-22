// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React from "react";
import Contact from "@/components/Contact";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Support Page - PEBEC",
  description: "Contact Us Page"
};
const SupportPage = () => {
  return <div className="pb-20 pt-40">
      <Contact />
    </div>;
};
export default SupportPage;