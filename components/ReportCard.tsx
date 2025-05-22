// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Download, Eye, FileText } from "lucide-react";
interface Report {
  _id: Id<"reports">;
  title: string;
  description: string;
  fileId: Id<"_storage">;
  reportCoverUrl?: Id<"_storage">;
  fileSize: number;
  publishedAt: number;
  uploadedBy: Id<"users">;
}
export default function ReportCard({
  report
}: {
  report: Report;
}) {
  const fileUrl = useQuery(api.reports.getStorageUrl, report.fileId ? {
    storageId: report.fileId
  } : "skip");
  const coverImageUrl = useQuery(api.reports.getStorageUrl, report.reportCoverUrl ? {
    storageId: report.reportCoverUrl
  } : "skip");
  const formattedDate = new Date(report.publishedAt).toLocaleDateString();
  const formattedSize = `${report.fileSize.toFixed(2)} MB`;
  return <div className="relative bg-white shadow-lg rounded-lg border border-gray-300 overflow-visible flex flex-col h-full transition-all hover:shadow-xl hover:-translate-y-1">
      {}
      <div className="absolute top-0 left-0 bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase rounded-br-lg">
        PDF
      </div>

      {}
      <div className="relative w-full h-48 flex items-center justify-center bg-gray-50">
        {coverImageUrl ? <img src={coverImageUrl} alt={report.title} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center text-gray-500">
            <FileText className="w-12 h-12" />
            <span className="text-sm">No Cover Image</span>
          </div>}
      </div>

      {}
      <div className="p-5 flex flex-col flex-grow">
        <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
        <p className="text-xs text-gray-500 mt-1">📅 Uploaded on {formattedDate}</p>
        <p className="text-sm text-gray-700 mt-2">{report.description}</p>

        {}
        <p className="text-xs text-gray-500 mt-1">📂 {formattedSize}</p>

        {}
        <div className="mt-auto flex justify-between gap-2 pt-4">
          {fileUrl && <Link href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 transition text-white text-xs text-center justify-center">
         <Eye className="w-4 h-4" />
         View
       </Link>}
          {fileUrl && <a href={fileUrl} download={`${report.title}.pdf`} target="_blank" className="download-button relative flex items-center gap-2 px-3 py-1.5 rounded-md text-white text-xs text-center justify-center z-50 overflow-visible">
         <span className="docs">
           <Download className="w-4 h-4" />
           Download
         </span>
         <span className="download absolute inset-0 flex items-center justify-center bg-green-500 hover:bg-green-600 rounded-md z-50">
           <Download className="w-4 h-4" />
         </span>
       </a>}
        </div>
      </div>
    </div>;
}