// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React from "react";
import { Metadata } from "next";
import FullNotifications from "@/components/FullNotifications";
export const metadata: Metadata = {
  title: "Notifications",
  description: "Your notifications"
};
const Notifications = () => {
  return <div className="pb-20 pt-40">
      <FullNotifications />
    </div>;
};
export default Notifications;