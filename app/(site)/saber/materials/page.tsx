// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import type { ReactNode } from "react";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";

type Material = {
  _id: string;
  title: string;
  description: string;
  fileSize: number;
  materialUploadId: string;
  thumbnailId?: string;
  createdAt: number;
  reference?: string;
  materialType?: string;
  state?: string;
};

function MaterialCard({
  material,
  getDownloadUrl,
  getFileIcon,
  formatFileSize,
  getReferenceColor,
}: {
  material: Material;
  getDownloadUrl: ReturnType<typeof useMutation<typeof api.tickets.getStorageUrl>>;
  getFileIcon: (fileName: string) => ReactNode;
  formatFileSize: (sizeInMB: number) => string;
  getReferenceColor: (reference: string) => string;
}) {
  const thumbnailUrl = useQuery(
    api.reports.getStorageUrl,
    material.thumbnailId ? { storageId: material.thumbnailId as any } : "skip"
  );

  const handleDownload = async () => {
    try {
      const url = await getDownloadUrl({
        storageId: material.materialUploadId as any,
      });
      if (url) {
        window.open(url, "_blank");
        toast.success("File downloaded successfully");
      } else {
        toast.error("Could not retrieve download link");
      }
    } catch (error) {
      toast.error("Failed to download file");
      console.error("Download error:", error);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      {thumbnailUrl && (
        <div className="w-full h-48 relative overflow-hidden bg-gray-100">
          <img
            src={thumbnailUrl}
            alt={material.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            {!thumbnailUrl && getFileIcon(material.title)}
            <CardTitle className="text-lg leading-tight">{material.title}</CardTitle>
          </div>
          {material.state && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {material.state}
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm line-clamp-2">
          {material.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>File Size:</span>
            <span className="font-medium">{formatFileSize(material.fileSize)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Added:</span>
            <span className="font-medium">{format(new Date(material.createdAt), "MMM dd, yyyy")}</span>
          </div>
          {material.reference && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Category:</span>
              <Badge className={getReferenceColor(material.reference)}>
                {material.reference === "internal-general"
                  ? "Internal"
                  : material.reference.charAt(0).toUpperCase() + material.reference.slice(1)}
              </Badge>
            </div>
          )}
        </div>
        <Button
          onClick={handleDownload}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
}

function MaterialsGrid({
  materials,
  emptyTitle,
  emptyDescription,
  getDownloadUrl,
  getFileIcon,
  formatFileSize,
  getReferenceColor,
}: {
  materials: Material[];
  emptyTitle: string;
  emptyDescription: string;
  getDownloadUrl: ReturnType<typeof useMutation<typeof api.tickets.getStorageUrl>>;
  getFileIcon: (fileName: string) => ReactNode;
  formatFileSize: (sizeInMB: number) => string;
  getReferenceColor: (reference: string) => string;
}) {
  if (materials.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyTitle}</h3>
          <p className="text-gray-600">{emptyDescription}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {materials.map((material) => (
        <MaterialCard
          key={material._id}
          material={material}
          getDownloadUrl={getDownloadUrl}
          getFileIcon={getFileIcon}
          formatFileSize={formatFileSize}
          getReferenceColor={getReferenceColor}
        />
      ))}
    </div>
  );
}

export default function SaberMaterialsPage() {
  const grouped = useQuery(api.saber_materials.getPublicSaberMaterialsGrouped);
  const getDownloadUrl = useMutation(api.tickets.getStorageUrl);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (["xlsx", "xls", "csv"].includes(extension || "")) {
      return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
    }
    return <FileText className="h-6 w-6 text-blue-600" />;
  };

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(1)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const getReferenceColor = (reference: string) => {
    switch (reference) {
      case "saber":
        return "bg-blue-100 text-blue-800";
      case "website":
        return "bg-green-100 text-green-800";
      case "internal-general":
        return "bg-purple-100 text-purple-800";
      case "framework":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const finalResults = grouped?.finalResults ?? [];
  const priorResults = grouped?.priorResults ?? [];
  const generalMaterials = grouped?.generalMaterials ?? [];
  const total = grouped?.total ?? 0;

  return (
    <div>
      <section className="bg-gray-300 border-b border-sky-200 py-12 mt-30">
        <div className="max-w-7xl mx-auto px-6 mt-10">
          <Link
            href="/saber"
            className=" mb-5 inline-flex items-center text-sky-700 font-medium hover:underline text-sm"
          >
            ← Back to Saber
          </Link>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-4">
            <h1 className="text-4xl md:text-4xl font-extrabold text-black tracking-tight">
              SABER Materials
            </h1>
            <p className="text-gray-700 text-lg">
              State APA reports and public SABER documents, guides, and resources.
            </p>
          </div>
          <div className="flex-1">
            <Image
              src="/images/dli_banner.svg"
              alt="SABER Materials"
              width={400}
              height={300}
              className="mx-auto"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6 mt-10">
        <div className="md:col-span-2 space-y-6">
          {grouped === undefined ? (
            <p className="text-gray-500">Loading materials...</p>
          ) : total === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Public Materials Available</h3>
                <p className="text-gray-600">
                  There are currently no public SABER materials available. Please check back later.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="final" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="final" className="text-xs sm:text-sm py-2">
                  Final Results ({finalResults.length})
                </TabsTrigger>
                <TabsTrigger value="prior" className="text-xs sm:text-sm py-2">
                  Prior Results ({priorResults.length})
                </TabsTrigger>
                <TabsTrigger value="general" className="text-xs sm:text-sm py-2">
                  Materials ({generalMaterials.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="final" className="mt-6">
                <MaterialsGrid
                  materials={finalResults}
                  emptyTitle="No Final Results yet"
                  emptyDescription="Final APA reports by state will appear here once uploaded and tagged."
                  getDownloadUrl={getDownloadUrl}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  getReferenceColor={getReferenceColor}
                />
              </TabsContent>

              <TabsContent value="prior" className="mt-6">
                <MaterialsGrid
                  materials={priorResults}
                  emptyTitle="No Prior Results yet"
                  emptyDescription="Prior results reports by state will appear here once uploaded."
                  getDownloadUrl={getDownloadUrl}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  getReferenceColor={getReferenceColor}
                />
              </TabsContent>

              <TabsContent value="general" className="mt-6">
                <MaterialsGrid
                  materials={generalMaterials}
                  emptyTitle="No general materials"
                  emptyDescription="Programme guides and other SABER resources will appear here."
                  getDownloadUrl={getDownloadUrl}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  getReferenceColor={getReferenceColor}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <aside className="space-y-6">
          <div className="bg-gray-50 border p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Overview</h3>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Final Results</p>
                  <p className="text-xl font-bold text-gray-900">{finalResults.length}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Prior Results</p>
                  <p className="text-xl font-bold text-gray-900">{priorResults.length}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">General materials</p>
                  <p className="text-xl font-bold text-gray-900">{generalMaterials.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
