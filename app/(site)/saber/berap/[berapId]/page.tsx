// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Download, FileText, Paperclip } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import Loader from "@/components/Loader";
export default function BERAPDetailPage() {
  const {
    berapId
  } = useParams();
  const berap = useQuery(api.saber.getBERAPById, {
    id: berapId as Id<"berap">
  });
  const allMaterials = useQuery(api.saber.getMaterialsByParent, {
    parentId: berapId as Id<"berap">
  });
  const materials = allMaterials?.filter((_, index) => index !== 1) || [];
  if (!berap) return <p className="text-center mt-10">Loading BERAP...</p>;
  return <div>
      {}
      <section className="bg-gray-300 border-b border-sky-200 py-12 mt-30">
        <div className="max-w-7xl mx-auto px-6 mt-10">
          <Link href="/saber" className=" mb-5 inline-flex items-center text-sky-700 font-medium hover:underline text-sm">
            ← Back to Saber
          </Link>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-2">
            <h1 className="text-4xl md:text-4xl font-extrabold text-black tracking-tight">
              {berap.title}
            </h1>
            <p className="text-gray-700 text-lg">Year: {berap.year}</p>
          </div>
          <div className="flex-1">
            <Image src="/images/berap_banner.svg" alt="BERAP Banner" width={400} height={300} className="mx-auto" />
          </div>
        </div>
      </section>

      {}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6 mt-10">
        {}
        <div className="md:col-span-2 space-y-6">
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

        {}
        <aside className="space-y-6">
          <div className="bg-gray-50 border p-4 rounded-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Paperclip className="w-5 h-5 text-blue-600" /> Resource Materials
            </h3>
            {materials === undefined ? <div className="flex justify-center items-center py-6">
                <Loader />
              </div> : materials.length === 0 ? <p className="text-sm text-muted-foreground">No materials uploaded.</p> : <ul className="space-y-3">
                {materials.map(mat => <li key={mat._id} className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3 flex items-center justify-between">
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
        </aside>
      </div>
    </div>;
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
