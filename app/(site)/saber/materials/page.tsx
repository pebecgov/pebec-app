// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";

export default function SaberMaterialsPage() {
  const publicMaterials = useQuery(api.saber_materials.getPublicSaberMaterials) || [];
  const getDownloadUrl = useMutation(api.tickets.getStorageUrl);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const url = await getDownloadUrl({
        storageId: fileId as any
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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
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

  return (
    <div>
      {/* Hero/Header Section to match [saberId] layout */}
      <section className="bg-gray-300 border-b border-sky-200 py-12 mt-30">
        <div className="max-w-7xl mx-auto px-6 mt-10">
          <Link href="/saber" className=" mb-5 inline-flex items-center text-sky-700 font-medium hover:underline text-sm">
            ← Back to Saber
          </Link>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-4">
            <h1 className="text-4xl md:text-4xl font-extrabold text-black tracking-tight">SABER Materials</h1>
            <p className="text-gray-700 text-lg">Access SABER documents, guides, and resources for public use.</p>
          </div>
          <div className="flex-1">
            <Image src="/images/dli_banner.svg" alt="SABER Materials" width={400} height={300} className="mx-auto" />
          </div>
        </div>
      </section>

      {/* Main Content + Sidebar to match [saberId] grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6 mt-10">
        {/* Main column */}
        <div className="md:col-span-2 space-y-10">
          {/* Materials Grid */}
          {publicMaterials.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {publicMaterials.map((material) => (
                <Card key={material._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(material.title)}
                        <CardTitle className="text-lg leading-tight">{material.title}</CardTitle>
                      </div>
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
                            {material.reference === "internal-general" ? "Internal" : material.reference.charAt(0).toUpperCase() + material.reference.slice(1)}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button onClick={() => handleDownload(material.materialUploadId, material.title)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Public Materials Available</h3>
                <p className="text-gray-600">There are currently no public SABER materials available. Please check back later or contact the administration.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-gray-50 border p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Overview</h3>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Public Materials</p>
                    <p className="text-2xl font-bold text-gray-900">{publicMaterials.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
