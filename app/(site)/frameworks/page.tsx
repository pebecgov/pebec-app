"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { DownloadIcon } from "lucide-react";
import Image from "next/image";

const ITEMS_PER_PAGE = 25;

export default function FrameworksPage() {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [frameworkUrls, setFrameworkUrls] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  const frameworks = useQuery(api.saber_materials.getSaberMaterialsByReference, {
    reference: "framework",
  });

  const getFileUrl = useMutation(api.tickets.getStorageUrl);

  useEffect(() => {
    const fetchUrls = async () => {
      if (frameworks) {
        const urls: Record<string, string> = {};
        for (const item of frameworks) {
          if (item.materialUploadId) {
            const url = await getFileUrl({ storageId: item.materialUploadId });
            if (url) urls[item._id] = url;
          }
        }
        setFrameworkUrls(urls);
      }
    };
    fetchUrls();
  }, [frameworks, getFileUrl]);

  const sortByDate = <T extends { createdAt: number | string }>(
    items: T[],
    order: "newest" | "oldest" = "newest"
  ) => {
    return [...items].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return order === "newest" ? bDate - aDate : aDate - bDate;
    });
  };

  const sortedFrameworks = sortByDate(frameworks || [], sortOrder);
  const paginatedFrameworks = sortedFrameworks.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil((frameworks?.length || 0) / ITEMS_PER_PAGE);

  return (
    <div className="pb-20 mt-25">
      {/* 🔥 HERO SECTION */}
      {/* HERO SECTION - Updated */}
<section className="bg-gray-50 border-b">
  <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col md:flex-row items-center justify-between gap-10">
    
    {/* Left: Title & Description */}
    <div className="text-center md:text-left max-w-xl">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
        Frameworks
      </h1>
      <p className="mt-4 text-gray-600 text-base md:text-lg">
        Discover official frameworks guiding reforms and policy development.
      </p>
    </div>

    {/* Right: Icon */}
    <div className="w-full md:w-[300px] lg:w-[360px]">
      <img
        src="/images/frameworks.svg"
        alt="Frameworks Icon"
        className="w-full h-auto object-contain"
      />
    </div>

  </div>
</section>


      {/* 🔧 FILTER & SORTING */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            All Frameworks
          </h2>

          <Select
            value={sortOrder}
            onValueChange={(value) => {
              setSortOrder(value as "newest" | "oldest");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest to Oldest</SelectItem>
              <SelectItem value="oldest">Oldest to Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 📄 FRAMEWORK CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedFrameworks.map((item) => (
            <Card
              key={item._id}
              className="flex flex-col justify-between h-full border shadow-sm hover:shadow-md transition-all"
            >
              <CardHeader className="pb-1">
                <CardTitle className="text-base font-semibold text-green-700 break-words leading-snug">
                  {item.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  📅 {format(new Date(item.createdAt), "PPP")}
                </p>
              </CardHeader>

              <CardContent className="flex flex-col flex-grow justify-between gap-3 mt-2">
                <p className="text-sm text-gray-600 line-clamp-[6]">{item.description}</p>

                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  📁{" "}
                  {item.fileSize > 0
                    ? `${(item.fileSize / 1024 / 1024).toFixed(2)} MB`
                    : "< 0.01 MB"}
                </div>

                <a
                  href={frameworkUrls[item._id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto"
                >
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Download Framework
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ⏮ PAGINATION */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
