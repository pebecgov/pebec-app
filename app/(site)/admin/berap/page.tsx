'use client';

import { BerapUploadForm } from "@/components/BerapUploadForm";
import { DocCard } from "@/components/DocCard";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function AdminBerapPage() {
  const documents = useQuery(api.berapDocuments.list);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manage BERAP Documents</h1>
      <BerapUploadForm />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents?.map((doc) => (
          <DocCard
            key={doc._id}
            title={doc.title}
            description={doc.description}
            fileId={doc.fileId}
            fileName={doc.fileName}
            date={new Date(doc.uploadedAt).toLocaleDateString()}
          />
        ))}
      </div>
    </div>
  );
} 