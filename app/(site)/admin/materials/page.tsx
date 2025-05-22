// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDownToLine, Pencil, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import AddSaberMaterialModal from "@/components/SaberMaterials";
import EditMaterialRolesModal from "@/components/EditMaterialsRolesModal";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const roles = ["admin", "user", "mda", "staff", "reform_champion", "deputies", "magistrates", "state_governor", "president", "vice_president"] as const;
const references = ["saber", "website", "general", "framework"] as const;
type Role = typeof roles[number];
type Reference = typeof references[number];
export default function SaberMaterialsPage() {
  const {
    user
  } = useUser();
  const userRole = user?.publicMetadata?.role as string;
  const [selectedRole, setSelectedRole] = useState<Role | "all">("all");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const materialsPerPage = 20;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Id<"saber_materials"> | null>(null);
  const getDownloadUrl = useMutation(api.tickets.getStorageUrl);
  const allMaterials = useQuery(api.saber_materials.getAllSaberMaterials);
  const deleteMaterial = useMutation(api.saber_materials.deleteSaberMaterial);
  const groupedMaterials = references.reduce((acc, ref) => {
    acc[ref] = allMaterials?.filter(mat => {
      const matchesRole = selectedRole === "all" || mat.roles.includes(selectedRole as Role);
      return mat.reference === ref && matchesRole;
    }) || [];
    return acc;
  }, {} as Record<string, any[]>);
  const renderMaterials = (materials: any[]) => {
    const paginated = materials.slice((currentPage - 1) * materialsPerPage, currentPage * materialsPerPage);
    const totalPages = Math.ceil(materials.length / materialsPerPage);
    return <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {paginated.map(mat => <div key={mat._id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between h-full">
              <div className="flex gap-3 mb-3 items-start">
                <div className="min-w-[36px] min-h-[36px] rounded-md bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">File</span>
                </div>
                <div className="flex-1 max-w-full">
                  <h2 className="text-base font-semibold text-gray-800 leading-snug break-words break-all line-clamp-2">
                    {mat.title}
                  </h2>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {(mat.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-4 min-h-[80px]">
                {mat.description}
              </p>
              <div className="flex items-center justify-between gap-2 mt-auto">
                <Button onClick={async () => {
              const url = await getDownloadUrl({
                storageId: mat.materialUploadId
              });
              if (url) window.open(url, "_blank");else toast.error("Could not retrieve download link");
            }} className="w-full text-sm bg-green-600 hover:bg-green-700 text-white">
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Download
                </Button>
                {userRole === "admin" && <>
                    <Button size="icon" variant="ghost" className="text-gray-500" onClick={() => setEditingMaterial(mat)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => {
                setMaterialToDelete(mat._id);
                setShowDeleteDialog(true);
              }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>}
              </div>
            </div>)}
        </div>

        {totalPages > 1 && <div className="flex justify-center gap-2 mt-8">
            {Array.from({
          length: totalPages
        }, (_, i) => <Button key={i} size="sm" variant={currentPage === i + 1 ? "default" : "outline"} onClick={() => setCurrentPage(i + 1)}>
                {i + 1}
              </Button>)}
          </div>}
      </>;
  };
  return <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Materials</h1>
        <Button onClick={() => setShowAddModal(true)} className="bg-green-600 text-white">
          + Add Material
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-full mb-10 sm:w-64">
          <Select value={selectedRole} onValueChange={val => setSelectedRole(val as Role | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {references.map(folder => <div key={folder} onClick={() => setOpenFolder(folder === openFolder ? null : folder)} className={`relative group flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 ${openFolder === folder ? 'opacity-100' : 'opacity-60'}`}>
            <div className="file relative w-20 h-16 origin-bottom [perspective:1500px]">
              <div className="work-5 bg-amber-600 w-full h-full origin-top rounded-2xl rounded-tl-none group-hover:shadow-[0_20px_40px_rgba(0,0,0,.2)] transition-all ease duration-300 relative after:absolute after:content-[''] after:bottom-[99%] after:left-0 after:w-16 after:h-3 after:bg-amber-600 after:rounded-t-2xl before:absolute before:content-[''] before:-top-[15px] before:left-[42px] before:w-3 before:h-3 before:bg-amber-600 before:[clip-path:polygon(0_35%,0%_100%,50%_100%);]" />
              <div className="work-4 absolute inset-1 bg-zinc-400 rounded-2xl transition-all ease duration-300 origin-bottom select-none group-hover:[transform:rotateX(-20deg)]" />
              <div className="work-3 absolute inset-1 bg-zinc-300 rounded-2xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-30deg)]" />
              <div className="work-2 absolute inset-1 bg-zinc-200 rounded-2xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-38deg)]" />
              <div className="work-1 absolute bottom-0 bg-gradient-to-t from-amber-500 to-amber-400 w-full h-[60px] rounded-2xl rounded-tr-none after:absolute after:content-[''] after:bottom-[99%] after:right-0 after:w-[92px] after:h-[12px] after:bg-amber-400 after:rounded-t-2xl before:absolute before:content-[''] before:-top-[10px] before:right-[88px] before:size-2.5 before:bg-amber-400 before:[clip-path:polygon(100%_14%,50%_100%,100%_100%);] transition-all ease duration-300 origin-bottom flex items-end group-hover:shadow-[inset_0_20px_40px_#fbbf24,_inset_0_-20px_40px_#d97706] group-hover:[transform:rotateX(-46deg)_translateY(1px)]" />
            </div>
            <p className="text-sm mt-2 font-medium capitalize text-gray-700">{folder}</p>
          </div>)}
      </div>

      {openFolder ? renderMaterials(groupedMaterials[openFolder]) : <p className="text-sm text-muted-foreground text-center">Select a folder to view materials.</p>}

      <AddSaberMaterialModal open={showAddModal} onClose={() => setShowAddModal(false)} />
      {editingMaterial && <EditMaterialRolesModal open={!!editingMaterial} onClose={() => setEditingMaterial(null)} material={editingMaterial} />}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Material</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this material? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={async () => {
            if (!materialToDelete) return;
            try {
              await deleteMaterial({
                materialId: materialToDelete
              });
              toast.success("Material deleted");
            } catch {
              toast.error("Error deleting file");
            } finally {
              setShowDeleteDialog(false);
              setMaterialToDelete(null);
            }
          }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}