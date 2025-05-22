// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { Download, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { format } from "date-fns";
import { FaFileAlt } from "react-icons/fa";
import { FaNoteSticky } from "react-icons/fa6";
import { FiPaperclip } from "react-icons/fi";
import Link from "next/link";
export default function SaberDliPage() {
  const {
    saberId
  } = useParams();
  const dli = useQuery(api.saber.getDLIById, saberId ? {
    id: saberId as Id<"dli">
  } : "skip");
  const allMaterials = useQuery(api.saber.getAllMaterials) || [];
  const getStorageUrl = useMutation(api.saber.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLDivElement>(null);
  const materials = allMaterials.filter(m => m.parentId === saberId && m.parentType === "dli");
  const notes = materials.filter(m => m.type === "note");
  const videos = materials.filter(m => m.type === "video");
  const downloadable = materials.filter(m => m.type === "document" && m.fileId);
  useEffect(() => {
    const fetchFileUrls = async () => {
      const urls: Record<string, string> = {};
      for (const mat of downloadable) {
        const url = await getStorageUrl({
          storageId: mat.fileId!
        });
        if (url) urls[mat._id] = url;
      }
      setFileUrls(urls);
    };
    if (downloadable.length > 0) fetchFileUrls();
  }, [JSON.stringify(downloadable)]);
  if (!dli) return <p className="text-center mt-10 text-gray-600">Loading...</p>;
  const scrollToVideos = () => videoRef.current?.scrollIntoView({
    behavior: "smooth"
  });
  return <div>
      {}


      <section className="bg-gray-300 border-b border-sky-200 py-12 mt-30">
      <div className="max-w-7xl mx-auto px-6 mt-10">
  <Link href="/saber" className=" mb-5 inline-flex items-center text-sky-700 font-medium hover:underline text-sm">
    ← Back to Saber
  </Link>
      </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-4">
            <h1 className="text-4xl md:text-4xl font-extrabold text-black tracking-tight">
              DLI {dli.number}: {dli.title}
            </h1>
            <p className="text-gray-700 text-lg">{dli.summary}</p>
            <div className="flex gap-3">
            {videos.length > 0 && <div className="flex gap-3">
    <Button onClick={scrollToVideos} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold gap-2 px-5 py-2.5 text-base rounded-lg transition">
      <PlayCircle className="w-5 h-5" />
      Check out videos
    </Button>
  </div>}

          </div>
          </div>
          <div className="flex-1">
            <Image src="/images/dli_banner.svg" alt="DLI Hero" width={400} height={300} className="mx-auto" />
          </div>
        </div>
      </section>

      {}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6 mt-10">
        {}
        <div className="md:col-span-2 space-y-10">
          <div dangerouslySetInnerHTML={{
          __html: dli.content
        }} />

          {}
          {videos.length > 0 && <section ref={videoRef}>
              <h2 className="text-2xl font-bold text-sky-800 mb-4">Videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[...videos].reverse().map(v => <div key={v._id} className="w-full border rounded-lg overflow-hidden">
                    <div className="aspect-video">
                      {v.link ? <iframe src={convertToEmbedUrl(v.link)} title={v.name} className="w-full h-full" allowFullScreen /> : <div className="p-4 text-sm text-gray-500">No video link</div>}
                    </div>
                    <div className="p-3 text-sm font-medium text-gray-800">{v.name}</div>
                  </div>)}
              </div>
            </section>}
        </div>

        {}
        <aside className="space-y-6">
          {}
          <div className="bg-gray-50 border p-4 rounded-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <FiPaperclip /> Resource Materials
            </h3>
            {downloadable.length === 0 ? <p className="text-sm text-muted-foreground">No documents available.</p> : <ul className="space-y-3">
                {downloadable.map(mat => <li key={mat._id} className="text-sm flex flex-col gap-2">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex gap-2 break-words max-w-[14rem] md:max-w-xs text-wrap">
                    <FaFileAlt className="text-sky-600 mt-0.5" />
                    <span>{mat.name}</span>
                  </div>
                  <a href={fileUrls[mat._id]} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </a>
                </div>
              </li>)}
              </ul>}
          </div>

          {}
          {notes.length > 0 && <div className="bg-gray-50 border p-4 rounded-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FaNoteSticky className="text-pink-500" /> Notes
              </h3>
              <ul className="space-y-4">
                {[...notes].reverse().map(note => <Card key={note._id} className="p-3 bg-white text-sm text-gray-700">
                    <p className="mb-2">{note.content}</p>
                    <div className="text-right text-xs text-gray-400">
                      {format(new Date(note.uploadedAt), "PPP p")}
                    </div>
                  </Card>)}
              </ul>
            </div>}
        </aside>
      </div>
    </div>;
}
function convertToEmbedUrl(link: string): string {
  try {
    if (link.includes("youtube.com/watch?v=")) {
      return link.replace("watch?v=", "embed/");
    }
    if (link.includes("youtu.be/")) {
      return link.replace("youtu.be/", "youtube.com/embed/");
    }
    if (link.includes("vimeo.com/")) {
      const id = link.split("/").pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    if (link.includes("facebook.com/")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}`;
    }
    if (link.includes("tiktok.com/")) {
      return `https://www.tiktok.com/embed/v2/${link.split("/").pop()}`;
    }
    return link;
  } catch (e) {
    return "";
  }
}