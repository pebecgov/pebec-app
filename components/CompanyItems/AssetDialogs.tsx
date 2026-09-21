"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import UndertakingUploader from "./UndertakingUploader";
import UserPicker, { type AssignableUser } from "./UserPicker";
import { getItemTypeMeta, todayInputValue } from "./itemTypeMeta";
import { convexErrorMessage } from "./convexError";

type AssetType = {
  _id: Id<"company_asset_types">;
  name: string;
};

export function AssetFormDialog({
  open,
  onOpenChange,
  types,
  users,
  mode,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: AssetType[];
  users: AssignableUser[];
  mode: "create" | "edit";
  initial?: {
    assetId: Id<"company_assets">;
    typeId: Id<"company_asset_types">;
    serialNumber: string;
    label?: string;
  };
}) {
  const createAsset = useMutation(api.companyAssets.createAsset);
  const updateAsset = useMutation(api.companyAssets.updateAsset);
  const [typeId, setTypeId] = useState(initial?.typeId ?? types[0]?._id);
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [assignToUserId, setAssignToUserId] = useState<Id<"users"> | undefined>();
  const [dateIssued, setDateIssued] = useState(todayInputValue());
  const [issueRemark, setIssueRemark] = useState("");
  const [undertakingStorageId, setUndertakingStorageId] = useState<Id<"_storage"> | undefined>();
  const [undertakingFileName, setUndertakingFileName] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!typeId && types[0]?._id) {
      setTypeId(types[0]._id);
    }
  }, [typeId, types]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!typeId) {
      toast.error("Add a property type in Configure first");
      return;
    }
    if (!serialNumber.trim()) {
      toast.error("Serial number is required");
      return;
    }

    try {
      setSaving(true);
      if (mode === "edit" && initial) {
        await updateAsset({
          assetId: initial.assetId,
          typeId,
          serialNumber: serialNumber.trim(),
          label: label.trim() || undefined,
        });
        toast.success("Property updated");
      } else {
        await createAsset({
          typeId,
          serialNumber: serialNumber.trim(),
          label: label.trim() || undefined,
          assignToUserId,
          dateIssued: assignToUserId ? dateIssued : undefined,
          issueRemark: assignToUserId ? issueRemark.trim() || undefined : undefined,
          undertakingStorageId: assignToUserId ? undertakingStorageId : undefined,
          undertakingFileName: assignToUserId ? undertakingFileName : undefined,
        });
        toast.success(assignToUserId ? "Property added and issued" : "Property added to inventory");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(convexErrorMessage(error, "Could not save property"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit property" : "Add company property"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the serial number or property type."
              : "Register a company property. You can keep it in inventory or issue it to staff now."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Property type</Label>
            <Select
              value={typeId}
              onValueChange={(value) => setTypeId(value as Id<"company_asset_types">)}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select a property type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => {
                  const meta = getItemTypeMeta(type.name);
                  const Icon = meta.icon;
                  return (
                    <SelectItem key={type._id} value={type._id}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial number (S/N)</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              placeholder="e.g. SN-2024-001"
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Property nickname / model (optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. MacBook Pro 14"
              className="h-11 rounded-xl"
            />
          </div>

          {mode === "create" && (
            <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div>
                <Label>Assign to staff</Label>
                <p className="mb-2 mt-1 text-xs text-gray-500">
                  Leave empty to keep the property in the office until someone needs it.
                </p>
                <UserPicker users={users} value={assignToUserId} onChange={setAssignToUserId} />
              </div>
              {assignToUserId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="dateIssued">Date issued</Label>
                    <Input
                      id="dateIssued"
                      type="date"
                      value={dateIssued}
                      onChange={(event) => setDateIssued(event.target.value)}
                      className="h-11 rounded-xl bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issueRemark">Remark</Label>
                    <Textarea
                      id="issueRemark"
                      value={issueRemark}
                      onChange={(event) => setIssueRemark(event.target.value)}
                      placeholder="Condition, charger included, notes..."
                      className="min-h-[80px] rounded-xl bg-white"
                    />
                  </div>
                  <UndertakingUploader
                    fileName={undertakingFileName}
                    onUploaded={(storageId, name) => {
                      setUndertakingStorageId(storageId);
                      setUndertakingFileName(name);
                    }}
                    onClear={() => {
                      setUndertakingStorageId(undefined);
                      setUndertakingFileName(undefined);
                    }}
                  />
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || types.length === 0}>
              {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Add property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IssueDialog({
  open,
  onOpenChange,
  assetId,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: Id<"company_assets">;
  users: AssignableUser[];
}) {
  const issueAsset = useMutation(api.companyAssets.issueAsset);
  const [assignToUserId, setAssignToUserId] = useState<Id<"users"> | undefined>();
  const [dateIssued, setDateIssued] = useState(todayInputValue());
  const [issueRemark, setIssueRemark] = useState("");
  const [undertakingStorageId, setUndertakingStorageId] = useState<Id<"_storage"> | undefined>();
  const [undertakingFileName, setUndertakingFileName] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!assignToUserId) {
      toast.error("Select the staff member receiving this property");
      return;
    }
    try {
      setSaving(true);
      await issueAsset({
        assetId,
        assignToUserId,
        dateIssued,
        issueRemark: issueRemark.trim() || undefined,
        undertakingStorageId,
        undertakingFileName,
      });
      toast.success("Property issued");
      onOpenChange(false);
    } catch (error) {
      toast.error(convexErrorMessage(error, "Could not issue property"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Issue property to staff</DialogTitle>
          <DialogDescription>
            Record who is taking this property, the date, and attach the signed undertaking.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Staff member</Label>
            <UserPicker
              users={users}
              value={assignToUserId}
              onChange={setAssignToUserId}
              placeholder="Select a staff member"
              allowNone={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Date issued</Label>
            <Input
              id="issueDate"
              type="date"
              value={dateIssued}
              onChange={(event) => setDateIssued(event.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueNote">Remark</Label>
            <Textarea
              id="issueNote"
              value={issueRemark}
              onChange={(event) => setIssueRemark(event.target.value)}
              placeholder="Condition, accessories, notes..."
              className="min-h-[80px] rounded-xl"
            />
          </div>
          <UndertakingUploader
            fileName={undertakingFileName}
            onUploaded={(storageId, name) => {
              setUndertakingStorageId(storageId);
              setUndertakingFileName(name);
            }}
            onClear={() => {
              setUndertakingStorageId(undefined);
              setUndertakingFileName(undefined);
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Issuing..." : "Issue property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReturnDialog({
  open,
  onOpenChange,
  assetId,
  staffName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: Id<"company_assets">;
  staffName?: string;
}) {
  const returnAsset = useMutation(api.companyAssets.returnAsset);
  const [dateReturned, setDateReturned] = useState(todayInputValue());
  const [returnRemark, setReturnRemark] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await returnAsset({
        assetId,
        dateReturned,
        returnRemark: returnRemark.trim() || undefined,
      });
      toast.success("Property returned to inventory");
      onOpenChange(false);
    } catch (error) {
      toast.error(convexErrorMessage(error, "Could not return property"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Mark property as returned</DialogTitle>
          <DialogDescription>
            {staffName
              ? `This will return the property from ${staffName} back to inventory.`
              : "This will return the property back to inventory."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="returnDate">Date returned</Label>
            <Input
              id="returnDate"
              type="date"
              value={dateReturned}
              onChange={(event) => setDateReturned(event.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="returnNote">Return remarks</Label>
            <Textarea
              id="returnNote"
              value={returnRemark}
              onChange={(event) => setReturnRemark(event.target.value)}
              placeholder="Condition on return, missing accessories..."
              className="min-h-[80px] rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Return property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
