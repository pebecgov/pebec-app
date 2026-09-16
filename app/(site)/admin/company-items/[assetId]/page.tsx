"use client";

import { useParams } from "next/navigation";
import AssetDetail from "@/components/CompanyItems/AssetDetail";
import { Id } from "@/convex/_generated/dataModel";

export default function CompanyItemDetailPage() {
  const params = useParams();
  const assetId = params.assetId as Id<"company_assets">;
  return <AssetDetail assetId={assetId} />;
}
