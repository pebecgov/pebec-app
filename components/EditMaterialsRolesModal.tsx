"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";

const allRoles = [
  "admin", "mda", "staff", "reform_champion","saber_agent",
  "deputies", "magistrates", "state_governor",
  "president", "vice_president",
] as const;

const references = ["saber", "website", "internal-general", "framework"] as const;

type Role = typeof allRoles[number];
type Reference = typeof references[number];

export default function EditMaterialRolesModal({ open, onClose, material }: { open: boolean, onClose: () => void, material: any }) {
  const updateRoles = useMutation(api.saber_materials.updateSaberMaterialRoles);
  const updateReference = useMutation(api.saber_materials.updateSaberMaterialReference);

  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);

  useEffect(() => {
    if (material) {
      setSelectedRoles(material.roles || []);
      setSelectedReference(material.reference || null);
    }
  }, [material]);

  const toggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    try {
      await updateRoles({ materialId: material._id, roles: selectedRoles });
      if (selectedReference) {
        await updateReference({ materialId: material._id, reference: selectedReference });
      }
      toast.success("Material updated");
      onClose();
    } catch {
      toast.error("Failed to update material");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Material Access</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <span className="font-medium text-sm text-gray-700">Roles Access</span>
          {allRoles.map((role) => (
            <label key={role} className="flex items-center gap-2">
              <Checkbox
                checked={selectedRoles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
              />
              <span className="capitalize">{role.replace("_", " ")}</span>
            </label>
          ))}
        </div>

        <div className="mt-6">
          <span className="font-medium text-sm text-gray-700">Location</span>
          <Select
            value={selectedReference || undefined}
            onValueChange={(val) => setSelectedReference(val as Reference)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {references.map((ref) => (
                <SelectItem key={ref} value={ref}>
                  {ref.charAt(0).toUpperCase() + ref.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}