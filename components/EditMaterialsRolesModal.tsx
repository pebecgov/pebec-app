// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  SABER_MATERIAL_TYPE_LABELS,
  type SaberMaterialType,
} from "@/lib/saberMaterials";

const allRoles = ["admin", "mda", "staff", "reform_champion", "saber_agent", "deputies", "magistrates", "state_governor", "president", "vice_president"] as const;
const references = ["saber", "website", "internal-general", "framework"] as const;
type Role = typeof allRoles[number];
type Reference = typeof references[number];

export default function EditMaterialRolesModal({
  open,
  onClose,
  material,
}: {
  open: boolean;
  onClose: () => void;
  material: any;
}) {
  const updateRoles = useMutation(api.saber_materials.updateSaberMaterialRoles);
  const updateReference = useMutation(api.saber_materials.updateSaberMaterialReference);
  const updateClassification = useMutation(api.saber_materials.updateSaberMaterialClassification);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [materialType, setMaterialType] = useState<SaberMaterialType>("general");

  useEffect(() => {
    if (material) {
      setSelectedRoles(material.roles || []);
      setSelectedReference(material.reference || null);
      setMaterialType(material.materialType || "general");
    }
  }, [material]);

  const toggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    try {
      await updateRoles({
        materialId: material._id,
        roles: selectedRoles,
      });
      if (selectedReference) {
        await updateReference({
          materialId: material._id,
          reference: selectedReference,
        });
      }
      await updateClassification({
        materialId: material._id,
        materialType,
        state: undefined,
      });
      toast.success("Material updated");
      onClose();
    } catch {
      toast.error("Failed to update material");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Material</DialogTitle>
          <p className="text-sm text-gray-500 truncate">{material?.title}</p>
        </DialogHeader>

        <div className="grid gap-3">
          <span className="font-medium text-sm text-gray-700">Public page type</span>
          <Select
            value={materialType}
            onValueChange={(val) => setMaterialType(val as SaberMaterialType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SABER_MATERIAL_TYPE_LABELS) as SaberMaterialType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {SABER_MATERIAL_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 mt-4">
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

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
