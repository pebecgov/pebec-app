import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DocCard } from "@/components/DocCard";

export function BerapSection() {
  const documents = useQuery(api.berapDocuments.list);

  return (
    <section className="py-8 px-4">
      <h2 className="text-2xl font-bold mb-6">BERAP Documents</h2>
      {documents?.length === 0 ? (
        <p className="text-gray-500">No documents uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents?.map((doc) => (
            <DocCard
              key={doc._id}
              title={doc.title}
              description={doc.description}
              fileUrl={doc.fileUrl}
              date={new Date(doc.uploadedAt).toLocaleDateString()}
            />
          ))}
        </div>
      )}
    </section>
  );
} 