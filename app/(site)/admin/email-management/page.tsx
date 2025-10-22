// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import SendUngaThankYouEmail from "@/components/Admin/SendUngaThankYouEmail";

export default function EmailManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Email Management</h1>
      
      <div className="space-y-8">
        <SendUngaThankYouEmail />
      </div>
    </div>
  );
}
