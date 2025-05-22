// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DownloadIcon } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
const ITEMS_PER_PAGE = 25;
export default function DownloadsPage() {
  const [category, setCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [materialUrls, setMaterialUrls] = useState<Record<string, string>>({});
  const [newsletterUrls, setNewsletterUrls] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const materials = useQuery(api.saber_materials.getSaberMaterialsByReference, {
    reference: "website"
  });
  const newsletters = useQuery(api.newsletters.getAllNewsletters);
  const getFileUrl = useMutation(api.tickets.getStorageUrl);
  useEffect(() => {
    const fetchUrls = async () => {
      if (materials) {
        const urls: Record<string, string> = {};
        for (const item of materials) {
          if (item.materialUploadId) {
            const url = await getFileUrl({
              storageId: item.materialUploadId
            });
            if (url) urls[item._id] = url;
          }
        }
        setMaterialUrls(urls);
      }
    };
    fetchUrls();
  }, [materials, getFileUrl]);
  useEffect(() => {
    const fetchNewsletterUrls = async () => {
      if (newsletters) {
        const urls: Record<string, string> = {};
        for (const n of newsletters) {
          if (n.attachmentId) {
            const url = await getFileUrl({
              storageId: n.attachmentId
            });
            if (url) urls[n._id] = url;
          }
        }
        setNewsletterUrls(urls);
      }
    };
    fetchNewsletterUrls();
  }, [newsletters, getFileUrl]);
  const sortByDate = <T extends {
    createdAt: number | string;
  },>(items: T[], order: "newest" | "oldest" = "newest") => {
    return [...items].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return order === "newest" ? bDate - aDate : aDate - bDate;
    });
  };
  const filteredMaterials = category === "newsletters" ? [] : sortByDate(materials || [], sortOrder);
  const filteredNewsletters = category === "all" || category === "newsletters" ? sortByDate(newsletters || [], sortOrder) : [];
  const allItems = [...filteredMaterials, ...filteredNewsletters];
  const paginatedItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  return <>
      {}
      <section className="bg-gray-50 border-b mt-5">
        <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col md:flex-row items-center justify-between gap-10">
          {}
          <div className="text-center md:text-left max-w-xl">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
              Downloads
            </h1>
            <p className="mt-4 text-gray-600 text-base md:text-lg">
              Explore and download important documents, newsletters, and resources.
            </p>
          </div>

          {}
          <div className="w-full md:w-[300px] lg:w-[360px]">
            <img src="/images/downloads.svg" alt="Downloads" className="w-full h-auto object-contain" />
          </div>
        </div>
      </section>

      {}
      <div className="max-w-6xl mx-auto mt-10 px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">All Downloads</h2>

          <div className="flex gap-4 flex-wrap items-center">
            <Tabs defaultValue="all" onValueChange={val => {
            setCategory(val);
            setPage(0);
          }}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={sortOrder} onValueChange={value => {
            setSortOrder(value as "newest" | "oldest");
            setPage(0);
          }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest to Oldest</SelectItem>
                <SelectItem value="oldest">Oldest to Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedItems.map((item: any) => {
          const isNewsletter = !!item.subject;
          const isMaterial = !!item.title;
          const url = isNewsletter ? newsletterUrls[item._id] : materialUrls[item._id];
          return <Card key={item._id} className={`flex flex-col justify-between h-full p-4 border ${isNewsletter ? "bg-gradient-to-br from-white to-blue-50 border-blue-100" : "border-gray-200"} shadow-sm hover:shadow-md transition-all`}>
                <CardHeader className="pb-1">
                  <CardTitle className={`text-lg font-semibold ${isNewsletter ? "text-green-700" : "text-green-800"}`}>
                    {isNewsletter ? item.subject : item.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    📅 {format(new Date(item.createdAt), "PPP")}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-col flex-grow justify-between gap-4 mt-2">
                  <div className="text-sm text-gray-600">
                    {isNewsletter ? "Stay updated with the latest news. Download and read our newsletter." : item.description}
                  </div>

                  {isMaterial && <div className="text-xs text-gray-500">
                      📁 {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>}

                  <a href={url} target="_blank" rel="noopener noreferrer" className="mt-auto">
                    <Button className={`w-full ${isNewsletter ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-900 hover:bg-gray-900 text-white"}`}>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                </CardContent>
              </Card>;
        })}
        </div>

        {}
        {totalPages > 1 && <div className="mt-10 flex justify-center gap-4">
            <Button variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              Previous
            </Button>
            <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next
            </Button>
          </div>}
      </div>
    </>;
}