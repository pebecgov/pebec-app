// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Trash, Eye, Download } from "lucide-react";
import { AddDLIModal } from "@/components/DLI/AddDLIModal";
import { AddBERAPModal } from "@/components/DLI/BERAPModal";
import { AddMaterialModal } from "@/components/DLI/AddMaterialModal";
type DLIType = {
  _id: Id<"dli">;
  number: number;
  title: string;
  summary: string;
  icon: string;
  content: string;
};
export default function SaberManagementPage() {
  const dlis = useQuery(api.saber.getAllDLIs) || [];
  const beraps = useQuery(api.saber.getAllBERAPs) || [];
  const materials = useQuery(api.saber.getAllMaterials) || [];
  const [editingDLI, setEditingDLI] = useState<DLIType | null>(null);
  const deleteDLI = useMutation(api.saber.deleteDLI);
  const deleteBERAP = useMutation(api.saber.deleteBERAP);
  const deleteMaterial = useMutation(api.saber.deleteMaterial);
  const getStorageUrl = useMutation(api.saber.getStorageUrl);
  const uploadMaterial = useMutation(api.saber.uploadMaterial);
  const createBERAP = useMutation(api.saber.createBERAP);
  const [showAddDLI, setShowAddDLI] = useState(false);
  const [showAddBERAP, setShowAddBERAP] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const fetchFileUrls = async () => {
      const newUrls: Record<string, string> = {};
      for (const mat of materials) {
        if (mat.fileId) {
          try {
            const url = await getStorageUrl({
              storageId: mat.fileId
            });
            if (url) newUrls[mat._id] = url;
          } catch (err) {
            console.error("File URL fetch failed", err);
          }
        }
      }
      setFileUrls(newUrls);
    };
    if (materials.length > 0) fetchFileUrls();
  }, [JSON.stringify(materials)]);
  return <div className="max-w-5xl mx-auto p-6">
      <Tabs defaultValue="dli" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dli">DLIs</TabsTrigger>
          <TabsTrigger value="berap">BERAP</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        {}
        <TabsContent value="dli">
          <div className="mb-4">
            <Button onClick={() => setShowAddDLI(true)}>
              <PlusCircle className="w-4 h-4 mr-2" /> Add DLI
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...dlis].sort((a, b) => a.number - b.number).map(dli => <Card key={dli._id} className="p-4 flex flex-col justify-between">
                <CardContent>
                  <div className="text-3xl mb-3">
                    <i className={dli.icon}></i>
                  </div>
                  <h3 className="text-lg font-bold">DLI {dli.number}: {dli.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dli.summary}</p>
                </CardContent>
                <div className="flex justify-between mt-4">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingDLI(dli)}>
  ✏️ Edit
              </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteDLI({
                id: dli._id
              })}>
                    <Trash className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </Card>)}
          </div>
        </TabsContent>

        {}
        <TabsContent value="berap">
          <div className="mb-4">
            <Button onClick={() => setShowAddBERAP(true)}>
              <PlusCircle className="w-4 h-4 mr-2" /> Add BERAP
            </Button>
          </div>
          <ul className="space-y-3">
            {beraps.map(b => <li key={b._id} className="border p-4 rounded bg-white flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold">{b.year} - {b.title}</div>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => deleteBERAP({
              id: b._id
            })}>
                  <Trash className="w-4 h-4 mr-1" /> Delete
                </Button>
              </li>)}
          </ul>
        </TabsContent>

        {}
     {}
      <TabsContent value="materials">
  <div className="mb-4">
    <Button onClick={() => setShowAddMaterial(true)}>
      <PlusCircle className="w-4 h-4 mr-2" /> Add Material
    </Button>
  </div>

  <ul className="space-y-3">
    {materials.map(mat => {
            const parent = mat.parentType === "dli" ? dlis.find(d => d._id === mat.parentId) : beraps.find(b => b._id === mat.parentId);
            const parentLabel = mat.parentType === "dli" && parent ? `DLI ${(parent as any).number}: ${(parent as any).title}` : mat.parentType === "berap" && parent ? `${(parent as any).year} - ${(parent as any).title}` : "Unknown";
            return <li key={mat._id} className="border p-4 rounded bg-white flex justify-between items-center">
          <div>
            <div className="font-medium">{mat.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{mat.type}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Attached to: <strong>{parentLabel}</strong>
            </div>
          </div>
          <div className="flex gap-2">
            {(mat.link || fileUrls[mat._id]) && <a href={mat.link || fileUrls[mat._id]} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" /> Open
                </Button>
              </a>}
            <Button size="sm" variant="destructive" onClick={() => deleteMaterial({
                  id: mat._id
                })}>
              <Trash className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </li>;
          })}
  </ul>
      </TabsContent>

      </Tabs>

      {}
      <AddDLIModal open={showAddDLI || !!editingDLI} onClose={() => {
      setShowAddDLI(false);
      setEditingDLI(null);
    }} existingDLI={editingDLI ?? undefined} />

      <AddBERAPModal open={showAddBERAP} onClose={() => setShowAddBERAP(false)} onSave={async data => {
      await createBERAP(data);
      setShowAddBERAP(false);
    }} />
      <AddMaterialModal open={showAddMaterial} onClose={() => setShowAddMaterial(false)} dliOptions={dlis.map(d => ({
      id: d._id as Id<"dli">,
      label: `DLI ${d.number}`
    }))} berapOptions={beraps.map(b => ({
      id: b._id as Id<"berap">,
      label: `${b.year} - ${b.title}`
    }))} onSave={async data => {
      await uploadMaterial({
        ...data,
        uploadedAt: Date.now()
      });
      setShowAddMaterial(false);
    }} />
    </div>;
}