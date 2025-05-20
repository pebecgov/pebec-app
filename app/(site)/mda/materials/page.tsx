"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDownToLine, Pencil, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import AddSaberMaterialModal from "@/components/SaberMaterials";
import EditMaterialRolesModal from "@/components/EditMaterialsRolesModal";
import { Id } from "@/convex/_generated/dataModel";

const roles = [
  "admin",
  "user",
  "mda",
  "staff",
  "reform_champion",
  "federal",
  "deputies",
  "magistrates",
  "state_governor",
  "president",
  "vice_president",
  "saber_agent",
] as const;

type Role = typeof roles[number];

export default function SaberMaterialsPage() {
  const { user } = useUser();
  const userRole = user?.publicMetadata?.role as Role | undefined;
  let materials: any[] | undefined = [];

  const [selectedRole, setSelectedRole] = useState<Role | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);

  const getDownloadUrl = useMutation(api.tickets.getStorageUrl);
  const deleteMaterial = useMutation(api.saber_materials.deleteSaberMaterial);
  const allMaterials = useQuery(api.saber_materials.getAllSaberMaterials);
  const roleMaterials = userRole
  ? useQuery(api.saber_materials.getSaberMaterialsByRole, { role: userRole })
  : undefined;


 if (userRole === "admin") {
  materials = allMaterials ?? [];
} else if (userRole) {
  materials = roleMaterials ?? [];
}
  const handleDelete = async (id: Id<"saber_materials">) => {
    try {
      await deleteMaterial({ materialId: id });
      toast.success("Material deleted");
    } catch (err) {
      toast.error("Error deleting file");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Materials</h1>
        {userRole === "admin" && (
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white">
            + Add Material
          </Button>
        )}
      </div>

      {userRole === "admin" && (
        <div className="mb-6 w-full sm:w-64">
          <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as Role | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {materials ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((mat) => (
            <div
              key={mat._id}
              className="w-full bg-[#07182E] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,183,255,0.5)] flex flex-col min-h-[300px]"
            >
              <div className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start mb-4 gap-3">
                    <div className="w-12 h-12 rounded-xl shadow-lg border-2 border-white/20 bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">FILE</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-white/90 break-words leading-snug line-clamp-2">
                        {mat.title}
                      </h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block bg-green-500/20 text-green-300/90">
                        {mat.fileSize.toFixed(2)} MB
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-white/80 mb-1">Description</h3>
                    <p className="text-xs text-white/60 break-words line-clamp-4">
                      {mat.description}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-2 mt-auto">
                  <Button
                    onClick={async () => {
                      const url = await getDownloadUrl({ storageId: mat.materialUploadId });
                      if (url) window.open(url, "_blank");
                      else toast.error("Could not retrieve download link");
                    }}
                    className="flex-1 bg-white/20 text-white rounded-lg px-3 py-2 text-xs font-medium transition hover:bg-white/30 flex items-center justify-center"
                  >
                    <ArrowDownToLine className="w-4 h-4 mr-1" />
                    Download
                  </Button>

                  {userRole === "admin" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white"
                        onClick={() => setEditingMaterial(mat)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => handleDelete(mat._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-4">Loading materials...</p>
      )}

      {userRole === "admin" && (
        <>
          <AddSaberMaterialModal open={showAddModal} onClose={() => setShowAddModal(false)} />
          {editingMaterial && (
            <EditMaterialRolesModal
              open={!!editingMaterial}
              onClose={() => setEditingMaterial(null)}
              material={editingMaterial}
            />
          )}
        </>
      )}
    </div>
  );
}
