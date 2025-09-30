// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";
import UngaRegistrations from "@/components/Admin/UngaRegistrations";
import EmailPreview from "@/components/Admin/EmailPreview";

export default function UngaRegistrationsAdminPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-6">UNGA Registrations</h1>
      
      {/* Email Preview Component */}
      <div className="mb-6">
        <EmailPreview />
      </div>
      
      <UngaRegistrations />
    </div>
  );
}


