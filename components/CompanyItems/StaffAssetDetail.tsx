"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft, FileText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrettyDate, getItemTypeMeta } from "./itemTypeMeta";
import TablePagination, { paginateRows } from "./TablePagination";

export default function StaffAssetDetail({ userId }: { userId: Id<"users"> }) {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUsers);
  const isAdmin = currentUser?.role === "admin";
  const staff = useQuery(
    api.companyAssets.getStaffAssets,
    isAdmin ? { userId } : "skip",
  );
  const [heldPage, setHeldPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  if (currentUser === undefined) {
    return <p className="py-16 text-center text-gray-500">Loading staff properties...</p>;
  }
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <p className="py-16 text-center text-red-500">
        Unauthorized: Only admins can manage company properties.
      </p>
    );
  }
  if (staff === undefined) {
    return <p className="py-16 text-center text-gray-500">Loading staff properties...</p>;
  }
  if (staff === null) {
    return <p className="py-16 text-center text-gray-500">Staff member not found.</p>;
  }

  const pagedHeld = paginateRows(staff.currentlyHeld, heldPage);
  const pagedHistory = paginateRows(staff.history, historyPage);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="outline" className="rounded-full" onClick={() => router.push("/admin/company-items")}>
        <ArrowLeft className="h-4 w-4" />
        Back to properties
      </Button>

      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={staff.imageUrl} alt={staff.name} />
            <AvatarFallback className="bg-emerald-100 text-lg text-emerald-800">
              {staff.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Staff register
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">{staff.name}</h1>
            <p className="text-sm text-gray-500">
              {staff.jobTitle || staff.role || staff.email}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Currently holding</h2>
        </div>
        {staff.currentlyHeld.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-500">
            This staff member is not holding any company property right now.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/70 hover:bg-emerald-50/70">
                  <TableHead className="px-4">Property</TableHead>
                  <TableHead>S/N</TableHead>
                  <TableHead>Date issued</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedHeld.rows.map((asset) => {
                  const meta = getItemTypeMeta(asset.typeName);
                  const Icon = meta.icon;
                  return (
                    <TableRow key={asset._id}>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${meta.soft}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-medium">{asset.typeName}</span>
                            <span className="block text-xs text-gray-500">{asset.label || "Company property"}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{asset.serialNumber}</TableCell>
                      <TableCell>{formatPrettyDate(asset.dateIssued)}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{asset.issueRemark || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/company-items/${asset._id}`}>Open property</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              page={pagedHeld.currentPage}
              totalPages={pagedHeld.totalPages}
              total={pagedHeld.total}
              start={pagedHeld.start}
              end={pagedHeld.end}
              onPageChange={setHeldPage}
            />
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Full history</h2>
          <p className="text-sm text-gray-500">
            Serial number, dates, remarks, and the attached undertaking for every property.
          </p>
        </div>
        {staff.history.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-500">No properties have been issued to this staff member.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/70 hover:bg-emerald-50/70">
                  <TableHead className="px-4">Property</TableHead>
                  <TableHead>S/N</TableHead>
                  <TableHead>Date issued</TableHead>
                  <TableHead>Issue remark</TableHead>
                  <TableHead>Date returned</TableHead>
                  <TableHead>Return remarks</TableHead>
                  <TableHead>Undertaking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedHistory.rows.map((row) => {
                  const meta = getItemTypeMeta(row.typeName);
                  const Icon = meta.icon;
                  return (
                    <TableRow key={row.issue._id}>
                      <TableCell className="px-4">
                        <Link
                          href={`/admin/company-items/${row.issue.assetId}`}
                          className="flex items-center gap-3"
                        >
                          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${meta.soft}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-medium text-gray-900">{row.typeName}</span>
                            <span className="block text-xs text-gray-500">{row.label || "Company property"}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.serialNumber}</TableCell>
                      <TableCell>{formatPrettyDate(row.issue.dateIssued)}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{row.issue.issueRemark || "—"}</TableCell>
                      <TableCell>{formatPrettyDate(row.issue.dateReturned)}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{row.issue.returnRemark || "—"}</TableCell>
                      <TableCell>
                        {row.issue.undertakingUrl ? (
                          <a
                            href={row.issue.undertakingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-800 hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              page={pagedHistory.currentPage}
              totalPages={pagedHistory.totalPages}
              total={pagedHistory.total}
              start={pagedHistory.start}
              end={pagedHistory.end}
              onPageChange={setHistoryPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
