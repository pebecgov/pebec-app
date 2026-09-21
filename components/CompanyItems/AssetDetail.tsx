"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, FileText, Pencil, Trash2, Undo2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssetFormDialog, IssueDialog, ReturnDialog } from "./AssetDialogs";
import { formatPrettyDate, getItemTypeMeta } from "./itemTypeMeta";
import { convexErrorMessage } from "./convexError";

export default function AssetDetail({ assetId }: { assetId: Id<"company_assets"> }) {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUsers);
  const isAdmin = currentUser?.role === "admin";
  const asset = useQuery(
    api.companyAssets.getAsset,
    isAdmin ? { assetId } : "skip",
  );
  const types = useQuery(api.companyAssets.listTypes, isAdmin ? {} : "skip");
  const users = useQuery(api.companyAssets.listAssignableUsers, isAdmin ? {} : "skip");
  const deleteAsset = useMutation(api.companyAssets.deleteAsset);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (currentUser === undefined) {
    return <p className="py-16 text-center text-gray-500">Loading property...</p>;
  }
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <p className="py-16 text-center text-red-500">
        Unauthorized: Only admins can manage company properties.
      </p>
    );
  }
  if (asset === undefined) {
    return <p className="py-16 text-center text-gray-500">Loading property...</p>;
  }
  if (asset === null) {
    return <p className="py-16 text-center text-gray-500">This property was not found.</p>;
  }

  const meta = getItemTypeMeta(asset.typeName);
  const Icon = meta.icon;
  const currentIssue = asset.issues.find((issue) => issue._id === asset.currentIssueId);
  const holder = users?.find((user) => user._id === asset.currentHolderUserId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="outline" className="rounded-full" onClick={() => router.push("/admin/company-items")}>
        <ArrowLeft className="h-4 w-4" />
        Back to properties
      </Button>

      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <span className={`flex h-14 w-14 items-center justify-center rounded-3xl ${meta.soft}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {asset.typeName}
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                  {asset.label || asset.serialNumber}
                </h1>
                <p className="mt-1 font-mono text-sm text-gray-500">S/N {asset.serialNumber}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {asset.status === "available" ? (
                <Button className="rounded-full" onClick={() => setIssueOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Issue to staff
                </Button>
              ) : (
                <Button className="rounded-full" onClick={() => setReturnOpen(true)}>
                  <Undo2 className="h-4 w-4" />
                  Mark returned
                </Button>
              )}
              <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="rounded-full text-red-600"
                onClick={async () => {
                  if (asset.status === "issued") {
                    toast.error("Return this property before deleting it");
                    return;
                  }
                  if (!window.confirm("Delete this property and its history?")) return;
                  try {
                    await deleteAsset({ assetId });
                    toast.success("Property deleted");
                    router.push("/admin/company-items");
                  } catch (error) {
                    toast.error(convexErrorMessage(error, "Could not delete this property"));
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <InfoCard label="Status">
            {asset.status === "issued" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Issued
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                In inventory
              </span>
            )}
          </InfoCard>
          <InfoCard label="Current staff">
            {asset.currentHolderUserId ? (
              <Link
                href={`/admin/company-items/staff/${asset.currentHolderUserId}`}
                className="flex items-center gap-2 font-medium text-emerald-800 hover:underline"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={holder?.imageUrl} alt={asset.currentHolderName} />
                  <AvatarFallback className="bg-emerald-100 text-[10px]">
                    {(asset.currentHolderName || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {asset.currentHolderName}
              </Link>
            ) : (
              <span className="text-gray-500">Nobody is using this property</span>
            )}
          </InfoCard>
          <InfoCard label="Date issued">
            {formatPrettyDate(currentIssue?.dateIssued)}
          </InfoCard>
        </div>
      </section>

      {currentIssue && (
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Current issue details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Staff name" value={currentIssue.staffName} />
            <Detail label="Date issued" value={formatPrettyDate(currentIssue.dateIssued)} />
            <Detail label="Issue remark" value={currentIssue.issueRemark || "—"} />
            <Detail
              label="Undertaking"
              value={
                currentIssue.undertakingUrl ? (
                  <a
                    href={currentIssue.undertakingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-emerald-800 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    {currentIssue.undertakingFileName || "View file"}
                  </a>
                ) : (
                  "No file attached"
                )
              }
            />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Issue history</h2>
          <p className="text-sm text-gray-500">
            Every time this property was given out and returned.
          </p>
        </div>
        {asset.issues.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-500">This property has not been issued yet.</p>
        ) : (
          <div className="divide-y">
            {asset.issues.map((issue) => (
              <div key={issue._id} className="grid gap-4 px-6 py-5 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Staff</p>
                  {issue.userId ? (
                    <Link
                      href={`/admin/company-items/staff/${issue.userId}`}
                      className="font-medium text-emerald-800 hover:underline"
                    >
                      {issue.staffName}
                    </Link>
                  ) : (
                    <p className="font-medium text-gray-900">{issue.staffName}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">Issued {formatPrettyDate(issue.dateIssued)}</p>
                  <p className="text-sm text-gray-500">
                    Returned {formatPrettyDate(issue.dateReturned)}
                  </p>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium text-gray-800">Issue remark:</span>{" "}
                    {issue.issueRemark || "—"}
                  </p>
                  <p>
                    <span className="font-medium text-gray-800">Return remarks:</span>{" "}
                    {issue.returnRemark || "—"}
                  </p>
                  {issue.undertakingUrl && (
                    <a
                      href={issue.undertakingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-800 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {issue.undertakingFileName || "Undertaking"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {issueOpen && (
        <IssueDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          assetId={assetId}
          users={users ?? []}
        />
      )}
      {returnOpen && (
        <ReturnDialog
          open={returnOpen}
          onOpenChange={setReturnOpen}
          assetId={assetId}
          staffName={asset.currentHolderName}
        />
      )}
      {editOpen && (
        <AssetFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          types={types ?? []}
          users={users ?? []}
          mode="edit"
          initial={{
            assetId: asset._id,
            typeId: asset.typeId,
            serialNumber: asset.serialNumber,
            label: asset.label,
          }}
        />
      )}
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1 text-sm text-gray-800">{value}</div>
    </div>
  );
}
