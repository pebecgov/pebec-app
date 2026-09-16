"use client";

import { useParams } from "next/navigation";
import StaffAssetDetail from "@/components/CompanyItems/StaffAssetDetail";
import { Id } from "@/convex/_generated/dataModel";

export default function CompanyItemStaffPage() {
  const params = useParams();
  const userId = params.userId as Id<"users">;
  return <StaffAssetDetail userId={userId} />;
}
