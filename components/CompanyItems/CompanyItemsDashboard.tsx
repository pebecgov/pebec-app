"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  Boxes,
  CheckCircle2,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssetFormDialog } from "./AssetDialogs";
import { getItemTypeMeta, formatPrettyDate } from "./itemTypeMeta";
import TablePagination, { paginateRows } from "./TablePagination";
import { convexErrorMessage } from "./convexError";

export default function CompanyItemsDashboard() {
  const currentUser = useQuery(api.users.getCurrentUsers);
  const isAdmin = currentUser?.role === "admin";
  const types = useQuery(api.companyAssets.listTypes, isAdmin ? {} : "skip");
  const users = useQuery(api.companyAssets.listAssignableUsers, isAdmin ? {} : "skip");
  const stats = useQuery(api.companyAssets.getStats, isAdmin ? {} : "skip");
  const staffHolders = useQuery(api.companyAssets.listStaffHolders, isAdmin ? {} : "skip");
  const createType = useMutation(api.companyAssets.createType);
  const updateType = useMutation(api.companyAssets.updateType);
  const deleteType = useMutation(api.companyAssets.deleteType);
  const seedCommonTypes = useMutation(api.companyAssets.seedCommonTypes);
  const deleteAsset = useMutation(api.companyAssets.deleteAsset);

  const [tab, setTab] = useState("items");
  const [status, setStatus] = useState<"all" | "available" | "issued">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<Id<"company_asset_types"> | null>(null);
  const [editingTypeName, setEditingTypeName] = useState("");
  const [itemsPage, setItemsPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<{
    assetId: Id<"company_assets">;
    typeId: Id<"company_asset_types">;
    serialNumber: string;
    label?: string;
  } | null>(null);

  const assets = useQuery(
    api.companyAssets.listAssets,
    isAdmin
      ? {
          status,
          typeId:
            typeFilter !== "all"
              ? (typeFilter as Id<"company_asset_types">)
              : undefined,
        }
      : "skip",
  );

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!assets) return [];
    if (!query) return assets;
    return assets.filter((asset) => {
      const haystack = `${asset.serialNumber} ${asset.label ?? ""} ${asset.typeName} ${asset.currentHolderName ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [assets, search]);

  const pagedAssets = paginateRows(filteredAssets, itemsPage);
  const pagedStaff = paginateRows(staffHolders ?? [], staffPage);

  useEffect(() => {
    setItemsPage(1);
  }, [search, status, typeFilter]);

  useEffect(() => {
    if (itemsPage !== pagedAssets.currentPage) {
      setItemsPage(pagedAssets.currentPage);
    }
  }, [itemsPage, pagedAssets.currentPage]);

  useEffect(() => {
    if (staffPage !== pagedStaff.currentPage) {
      setStaffPage(pagedStaff.currentPage);
    }
  }, [staffPage, pagedStaff.currentPage]);

  if (currentUser === undefined) {
    return <p className="py-16 text-center text-gray-500">Loading company properties...</p>;
  }
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <p className="py-16 text-center text-red-500">
        Unauthorized: Only admins can manage company properties.
      </p>
    );
  }

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    try {
      await createType({ name: newTypeName.trim() });
      setNewTypeName("");
      toast.success("Property type added");
    } catch (error) {
      toast.error(convexErrorMessage(error, "Could not add type"));
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedCommonTypes({});
      toast.success(
        result.added > 0
          ? `Added ${result.added} common property types`
          : "Common types are already added",
      );
    } catch (error) {
      toast.error(convexErrorMessage(error, "Could not add types"));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Inventory register
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              Company properties
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Track laptops, phones, cameras and every property issued to staff — including
              serial numbers, dates, remarks, and the signed undertaking file.
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="h-11 rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700"
          >
            <PackagePlus className="h-4 w-4" />
            Add property
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="All properties"
          value={stats?.total ?? 0}
          icon={Boxes}
          tone="from-emerald-100 to-emerald-50 text-emerald-800"
        />
        <StatCard
          label="With staff"
          value={stats?.issued ?? 0}
          icon={Users}
          tone="from-amber-100 to-orange-50 text-amber-800"
        />
        <StatCard
          label="In inventory"
          value={stats?.available ?? 0}
          icon={CheckCircle2}
          tone="from-sky-100 to-cyan-50 text-sky-800"
        />
        <StatCard
          label="Staff holding properties"
          value={stats?.staffWithItems ?? 0}
          icon={Sparkles}
          tone="from-violet-100 to-fuchsia-50 text-violet-800"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-11 rounded-full bg-white p-1 shadow-sm">
          <TabsTrigger value="items" className="rounded-full px-4">
            Properties
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-full px-4">
            Staff
          </TabsTrigger>
          <TabsTrigger value="configure" className="rounded-full px-4">
            Configure
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search serial, staff, or property..."
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="h-11 w-full rounded-xl md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="available">In inventory</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 w-full rounded-xl md:w-48">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(types ?? []).map((type) => (
                  <SelectItem key={type._id} value={type._id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/70 hover:bg-emerald-50/70">
                  <TableHead className="px-4">Property</TableHead>
                  <TableHead>S/N</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date issued</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets === undefined ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-gray-500">
                      Loading properties...
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="mx-auto max-w-sm">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                          <Boxes className="h-6 w-6" />
                        </div>
                        <p className="font-medium text-gray-800">No properties yet</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Add a property type in Configure, then register laptops, phones, and
                          other company property.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedAssets.rows.map((asset) => {
                    const meta = getItemTypeMeta(asset.typeName);
                    const Icon = meta.icon;
                    return (
                      <TableRow key={asset._id} className="hover:bg-emerald-50/40">
                        <TableCell className="px-4">
                          <Link
                            href={`/admin/company-items/${asset._id}`}
                            className="flex items-center gap-3"
                          >
                            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${meta.soft}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block font-medium text-gray-900">
                                {asset.typeName}
                              </span>
                              <span className="block text-xs text-gray-500">
                                {asset.label || "Company property"}
                              </span>
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-700">
                          {asset.serialNumber}
                        </TableCell>
                        <TableCell>
                          {asset.currentHolderUserId ? (
                            <Link
                              href={`/admin/company-items/staff/${asset.currentHolderUserId}`}
                              className="font-medium text-emerald-800 hover:underline"
                            >
                              {asset.currentHolderName}
                            </Link>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>{formatPrettyDate(asset.dateIssued)}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-gray-600">
                          {asset.issueRemark || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusPill status={asset.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="sm" className="h-8">
                              <Link href={`/admin/company-items/${asset._id}`}>Open</Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setEditAsset({
                                  assetId: asset._id,
                                  typeId: asset.typeId,
                                  serialNumber: asset.serialNumber,
                                  label: asset.label,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={async () => {
                                if (asset.status === "issued") {
                                  toast.error("Return this property before deleting it");
                                  return;
                                }
                                if (!window.confirm("Delete this property and its history?")) return;
                                try {
                                  await deleteAsset({ assetId: asset._id });
                                  toast.success("Property deleted");
                                } catch (error) {
                                  toast.error(
                                    convexErrorMessage(error, "Could not delete this property"),
                                  );
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filteredAssets.length > 0 && (
              <TablePagination
                page={pagedAssets.currentPage}
                totalPages={pagedAssets.totalPages}
                total={pagedAssets.total}
                start={pagedAssets.start}
                end={pagedAssets.end}
                onPageChange={setItemsPage}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/70 hover:bg-emerald-50/70">
                  <TableHead className="px-4">Staff</TableHead>
                  <TableHead>Currently holding</TableHead>
                  <TableHead>Total issued</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffHolders === undefined ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                      Loading staff...
                    </TableCell>
                  </TableRow>
                ) : staffHolders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-16 text-center text-gray-500">
                      No staff have been issued properties yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedStaff.rows.map((staff) => (
                    <TableRow key={staff.userId} className="hover:bg-emerald-50/40">
                      <TableCell className="px-4">
                        <Link
                          href={`/admin/company-items/staff/${staff.userId}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={staff.imageUrl} alt={staff.name} />
                            <AvatarFallback className="bg-emerald-100 text-xs text-emerald-800">
                              {staff.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            <span className="block font-medium text-gray-900">{staff.name}</span>
                            <span className="block text-xs text-gray-500">
                              {staff.jobTitle || staff.email}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {staff.currentlyHeld}
                        </span>
                      </TableCell>
                      <TableCell>{staff.totalIssued}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/company-items/staff/${staff.userId}`}>
                            View properties
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {(staffHolders?.length ?? 0) > 0 && (
              <TablePagination
                page={pagedStaff.currentPage}
                totalPages={pagedStaff.totalPages}
                total={pagedStaff.total}
                start={pagedStaff.start}
                end={pagedStaff.end}
                onPageChange={setStaffPage}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="configure">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Settings2 className="h-5 w-5 text-emerald-700" />
                  Property types
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  These names appear as the select list when adding a company property.
                </p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={handleSeed}>
                Add laptop, phone, camera...
              </Button>
            </div>
            <div className="mb-6 flex gap-2">
              <Input
                value={newTypeName}
                onChange={(event) => setNewTypeName(event.target.value)}
                placeholder="e.g. Camera, Laptop, Phone"
                className="h-11 rounded-xl"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddType();
                  }
                }}
              />
              <Button onClick={handleAddType} className="h-11 rounded-xl">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(types ?? []).map((type) => {
                const meta = getItemTypeMeta(type.name);
                const Icon = meta.icon;
                const isEditing = editingTypeId === type._id;
                return (
                  <div
                    key={type._id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-50 bg-emerald-50/40 p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${meta.soft}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {isEditing ? (
                        <Input
                          value={editingTypeName}
                          onChange={(event) => setEditingTypeName(event.target.value)}
                          className="h-9 rounded-lg"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-gray-800">{type.name}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {isEditing ? (
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={async () => {
                            try {
                              await updateType({ typeId: type._id, name: editingTypeName });
                              setEditingTypeId(null);
                              toast.success("Type updated");
                            } catch (error) {
                              toast.error(
                                convexErrorMessage(error, "Could not update this type"),
                              );
                            }
                          }}
                        >
                          Save
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTypeId(type._id);
                            setEditingTypeName(type.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={async () => {
                          try {
                            await deleteType({ typeId: type._id });
                            toast.success("Type deleted");
                          } catch (error) {
                            toast.error(
                              convexErrorMessage(error, "Could not delete this type"),
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {addOpen && (
        <AssetFormDialog
          key="create"
          open={addOpen}
          onOpenChange={setAddOpen}
          types={types ?? []}
          users={users ?? []}
          mode="create"
        />
      )}
      {editAsset && (
        <AssetFormDialog
          key={editAsset.assetId}
          open={Boolean(editAsset)}
          onOpenChange={(open) => {
            if (!open) setEditAsset(null);
          }}
          types={types ?? []}
          users={users ?? []}
          mode="edit"
          initial={editAsset}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Boxes;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "available" | "issued" }) {
  if (status === "issued") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
        Issued
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      In inventory
    </span>
  );
}
