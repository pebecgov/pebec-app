"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import FileUploader from "../file-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const ROLES = [
  "admin",
  "mda",
  "staff",
  "reform_champion",
  "deputies",
  "saber_agent",
  "magistrates",
  "state_governor",
  "president",
  "vice_president",
] as const;

type Role = typeof ROLES[number];

type Props = {
  open: boolean;
  onClose: () => void;
};

const references = ["saber", "website", "internal-general", "framework"] as const;
type Reference = typeof references[number];

export default function AddSaberMaterialModal({ open, onClose }: Props) {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  // ✅ Always call the hook – never conditionally
  const convexUser = useQuery(api.users.getUserByClerkId, {
    clerkUserId: clerkId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [reference, setReference] = useState<Reference | "">("");
  const [errors, setErrors] = useState<string[]>([]);

  const addMaterial = useMutation(api.saber_materials.addSaberMaterial);

  const handleSubmit = async () => {
    const missing: string[] = [];
  
    if (!title) missing.push("Title");
    if (!description) missing.push("Description");
    if (!fileId) missing.push("File Upload");
    if (!reference) missing.push("Reference");
  
    if (["saber", "internal-general"].includes(reference) && selectedRoles.length === 0) {
      missing.push("Access Roles");
    }
  
    if (!convexUser?._id) missing.push("User");
  
    if (missing.length > 0) {
      setErrors(missing);
      toast.error(`Please fill in: ${missing.join(", ")}`);
      return;
    }
  
    // ✅ ADD THIS GUARD FOR TYPESCRIPT
    if (!convexUser) return;
  
    try {
      await addMaterial({
        title,
        description,
        fileSize,
        createdBy: convexUser._id,
        createdAt: Date.now(),
        roles: selectedRoles,
        materialUploadId: fileId as any,
        reference: reference as Reference,
      });
  
      toast.success("Material uploaded successfully");
      setTitle("");
      setDescription("");
      setFileId(null);
      setSelectedRoles([]);
      setReference("");
      setErrors([]);
      onClose();
    } catch (error) {
      toast.error("Upload failed");
    }
  };
  

  const handleFileSet = (id: string) => {
    setFileId(id);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (file) setFileSize(Math.round(file.size / 1024 / 1024));
  };

  const toggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95%] sm:w-full max-h-[90vh] overflow-y-auto bg-white text-gray-900 rounded-xl border border-gray-200 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800">
            📁 Upload Material
          </DialogTitle>
          <DialogDescription>
            Fill all required fields to upload a new Saber material.
          </DialogDescription>
        </DialogHeader>

        {!convexUser ? (
          <p className="text-gray-500 text-sm">Loading user data...</p>
        ) : (
          <div className="space-y-6 mt-4">
            <div>
              <Input
                placeholder="Material Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-gray-300"
              />
              {errors.includes("Title") && (
                <p className="text-sm text-red-600 mt-1">Title is required.</p>
              )}
            </div>

            <div>
              <Textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-gray-300"
              />
              {errors.includes("Description") && (
                <p className="text-sm text-red-600 mt-1">Description is required.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Material Location</h3>
              <Select value={reference} onValueChange={(val) => setReference(val as Reference)}>
                <SelectTrigger className="w-full border-gray-300 bg-white">
                  <SelectValue placeholder="Select reference (location)" />
                </SelectTrigger>
                <SelectContent>
                {references.map((r) => (
  <SelectItem key={r} value={r}>
    {r === "website" ? "Website - Downloads section" : r.charAt(0).toUpperCase() + r.slice(1).replace("-", " ")}
  </SelectItem>
))}

                </SelectContent>
              </Select>
              {errors.includes("Reference") && (
                <p className="text-sm text-red-600 mt-1">Reference is required.</p>
              )}
            </div>

            {["saber", "internal-general"].includes(reference) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Select Access Roles</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={selectedRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <span className="capitalize">{role.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
                {errors.includes("Access Roles") && (
                  <p className="text-sm text-red-600 mt-1">At least one role must be selected.</p>
                )}
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Upload Supporting Document</h3>
              <FileUploader setFileId={handleFileSet} />
              {errors.includes("File Upload") && (
                <p className="text-sm text-red-600 mt-1">A file is required.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 text-white hover:bg-blue-700">
                Upload
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
