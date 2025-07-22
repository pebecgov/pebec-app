'use client';

import Link from "next/link";
import { Button } from "./ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type DocCardProps = {
  title: string;
  description?: string;
  fileId: string;
  fileName: string;
  date: string;
};

export function DocCard({ title, description, fileId, fileName, date }: DocCardProps) {
  const fileUrl = useQuery(api.files.getUrl, { storageId: fileId });

  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 mb-3">{description}</p>}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{date}</span>
        {fileUrl && (
          <Button asChild size="sm" variant="outline">
            <Link href={fileUrl} target="_blank" rel="noopener noreferrer" download={fileName}>
              Download
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
} 