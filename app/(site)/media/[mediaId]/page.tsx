// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FaFacebookMessenger, FaTwitter, FaLinkedinIn, FaShareAlt } from "react-icons/fa";
const getEmbedURL = (url: string) => {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const tiktok = url.match(/tiktok\.com\/(?:@[^/]+\/video\/)(\d+)/);
  if (tiktok) return `https://www.tiktok.com/embed/v2/${tiktok[1]}`;
  const facebook = url.match(/facebook\.com\/.*\/videos\/(\d+)/);
  if (facebook) return `https://www.facebook.com/video/embed?video_id=${facebook[1]}`;
  return null;
};
export default function MediaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.mediaId;
  const mediaId = typeof rawId === "string" ? rawId as Id<"media"> : undefined;
  const media = useQuery(api.media.getMediaById, mediaId ? {
    mediaId
  } : "skip");
  const [currentImage, setCurrentImage] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") setShareLink(window.location.href);
  }, []);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied to clipboard!");
    setShareOpen(false);
  };
  const handlePrev = () => {
    setCurrentImage(prev => prev === 0 ? media!.pictureUrls.length - 1 : prev - 1);
  };
  const handleNext = () => {
    setCurrentImage(prev => (prev + 1) % media!.pictureUrls.length);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStart.current !== null && touchEnd.current !== null) {
      const distance = touchStart.current - touchEnd.current;
      if (distance > 50) handleNext();
      if (distance < -50) handlePrev();
    }
    touchStart.current = null;
    touchEnd.current = null;
  };
  if (!media) return <div className="p-10 text-center">Loading...</div>;
  return <div className="max-w-4xl mx-auto py-8 px-4 mt-30 relative">
      {}
      <button onClick={() => router.push("/media")} className="absolute top-2 left-2 px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition">
        ← Back to Media
      </button>

      {}
      <div className="flex justify-between items-center mb-4 mt-8">
        <div>
          <h1 className="text-3xl font-semibold mb-1">{media.title}</h1>
          <p className="text-sm text-gray-500">
            {new Date(media.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
          </p>
        </div>

        {}
        <div className="relative">
          <button onClick={() => setShareOpen(prev => !prev)} className="flex items-center gap-2 px-3 py-1.5 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50">
            Share <FaShareAlt size={16} />
          </button>

          {shareOpen && <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-md z-50 overflow-hidden">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm">
                <FaFacebookMessenger className="text-blue-600" /> Facebook
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm">
                <FaTwitter className="text-sky-500" /> Twitter
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm">
                <FaLinkedinIn className="text-blue-700" /> LinkedIn
              </a>
              <button onClick={handleCopyLink} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
                📋 Copy Link
              </button>
            </div>}
        </div>
      </div>

      {}
     {}
    <div className="relative w-full mb-4 h-60 md:h-96 bg-black rounded-lg overflow-hidden">
      <Image src={media.pictureUrls[currentImage] ?? "/fallback.jpg"} alt={`Media image ${currentImage + 1}`} fill className="object-contain rounded-lg transition-all duration-300" quality={30} placeholder="blur" blurDataURL="/blur_placeholder.png" />


  {}
  <button onClick={handlePrev} className="absolute top-1/2 -translate-y-1/2 left-2 z-10 bg-white/70 p-2 rounded-full">
    ←
  </button>
  <button onClick={handleNext} className="absolute top-1/2 -translate-y-1/2 right-2 z-10 bg-white/70 p-2 rounded-full">
    →
  </button>
    </div>

    {}
    <div className="flex gap-2 overflow-x-auto justify-center md:justify-start px-1">
  {media.pictureUrls.map((url, idx) => <div key={idx} className={`relative w-20 h-20 md:w-24 md:h-24 rounded-md cursor-pointer border-2 ${currentImage === idx ? "border-blue-500" : "border-transparent"}`} onClick={() => setCurrentImage(idx)}>
    <Image src={url ?? "/fallback.jpg"} alt={`Thumbnail ${idx + 1}`} fill className="object-cover rounded" quality={30} placeholder="blur" blurDataURL="/blur_placeholder.png" />
  </div>)}
    </div>


      {}
      {Array.isArray(media.videoUrls) && media.videoUrls.length > 0 && <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Videos</h2>
          <div className="flex flex-col gap-6">
            {media.videoUrls.map((url, idx) => {
          const embed = getEmbedURL(url);
          return <div key={idx} className="aspect-video w-full bg-black rounded overflow-hidden">
                  {embed ? <iframe src={embed} title={`Video ${idx + 1}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className="text-white p-6">Invalid video link</div>}
                </div>;
        })}
          </div>
        </div>}

      {}
      <p className="text-lg text-gray-700 whitespace-pre-line">{media.description}</p>
    </div>;
}