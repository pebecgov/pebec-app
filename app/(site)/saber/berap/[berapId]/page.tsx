// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Download, FileText, Paperclip } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@headlessui/react";
export default function BERAPDetailPage() {
  const {
    berapId
  } = useParams();
  const berap = useQuery(api.saber.getBERAPById, {
    id: berapId as Id<"berap">
  });
  const router = useRouter();
  const materials = useQuery(api.saber.getMaterialsByParent, {
    parentId: berapId as Id<"berap">
  });
  const getStorageUrl = useMutation(api.saber.getStorageUrl);
  if (!berap) return <p className="text-center mt-10">Loading BERAP...</p>;
  return <>
      {}
      <div className="w-full bg-gray-100 border-b border-gray-200 py-10 px-6 md:px-20 mt-30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {}
          <div>
            <h1 className="text-2xl md:text-4xl font-semibold text-gray-900 mb-2">
              {berap.title}
            </h1>
            <p className="text-md text-gray-600">Year: {berap.year}</p>
          </div>

          {}
          <div className="relative w-full h-40 md:h-52">
            <Image src="/images/berap_banner.svg" alt="BERAP Banner" fill style={{
            objectFit: "contain"
          }} priority />
          </div>
        </div>
      </div>

      {}
      <Button onClick={() => router.back()} className="inline-flex items-center gap-2 text-blue-700 hover:underline text-sm font-medium px-10">
  <ArrowLeft className="w-4 h-4" />
  Go Back
    </Button>

      {}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {}
        <div className="bg-white border border-blue-100 rounded-lg shadow-sm px-6 py-5 mb-10 max-w-sm">
          <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold text-lg">
            <Paperclip className="w-5 h-5 text-blue-600" />
            Resource Materials
          </div>

          {materials?.length === 0 ? <p className="text-sm text-muted-foreground">No materials uploaded.</p> : <ul className="space-y-3">
              {materials!.map(mat => <li key={mat._id} className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {mat.name}
                    </span>
                  </div>
                  <DownloadButton fileId={mat.fileId} link={mat.link} />
                </li>)}
            </ul>}
        </div>

        {}
        <div className="space-y-6">
          <div className="prose prose-blue max-w-none text-gray-800" dangerouslySetInnerHTML={{
          __html: berap.description
        }} />

          {berap.privateSectorNotes && <div className="p-5 border rounded-md bg-blue-50">
              <h4 className="font-semibold text-blue-800">Private Sector Notes</h4>
              <p className="text-sm text-gray-700 mt-1">{berap.privateSectorNotes}</p>
            </div>}

          {berap.progressReport && <div className="p-5 border rounded-md bg-blue-50">
              <h4 className="font-semibold text-blue-800">Progress Report</h4>
              <p className="text-sm text-gray-700 mt-1">{berap.progressReport}</p>
            </div>}
        </div>
      </div>
    </>;
}
function DownloadButton({
  fileId,
  link
}: {
  fileId?: Id<"_storage">;
  link?: string;
}) {
  const getStorageUrl = useMutation(api.saber.getStorageUrl);
  const handleDownload = async () => {
    if (fileId) {
      const url = await getStorageUrl({
        storageId: fileId
      });
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Failed to fetch download URL");
      }
    } else if (link) {
      window.open(link, "_blank");
    } else {
      toast.warning("No file or link available");
    }
  };
  return <button onClick={handleDownload} title="Download" className="p-1.5 rounded-full hover:bg-blue-100">
      <Download className="w-5 h-5 text-blue-600" />
    </button>;
}