// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, FileSpreadsheet, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function WorldBankSaberMaterialsPage() {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  // Get SABER materials specifically for World Bank role
  const worldBankMaterials = useQuery(api.saber_materials.getSaberMaterialsByRole, {
    role: "world_bank"
  });

  const getDownloadUrl = useMutation(api.tickets.getStorageUrl);

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingFiles(prev => new Set([...prev, fileId]));
    
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
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
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
      return `${Math.round(sizeInMB * 1024)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SABER Materials</h1>
        <p className="text-gray-600">
          Access and download SABER program materials and documentation provided by PEBEC administration.
        </p>
      </div>

      {!worldBankMaterials ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading materials...</span>
        </div>
      ) : worldBankMaterials.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Available</h3>
            <p className="text-gray-600">
              There are currently no SABER materials available for World Bank users. 
              Please check back later or contact the administration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {worldBankMaterials.map((material) => (
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
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(material.createdAt)}</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleDownload(material.materialUploadId, material.title)}
                  disabled={downloadingFiles.has(material.materialUploadId)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {downloadingFiles.has(material.materialUploadId) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}